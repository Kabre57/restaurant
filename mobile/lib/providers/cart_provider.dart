import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class CartItem {
  final String productId;
  final String name;
  final double price;
  int quantity;

  CartItem({
    required this.productId,
    required this.name,
    required this.price,
    this.quantity = 1,
  });
}

class CartProvider with ChangeNotifier {
  final Map<String, CartItem> _items = {};

  Map<String, CartItem> get items => {..._items};

  int get itemCount => _items.length;

  double get totalAmount {
    var total = 0.0;
    _items.forEach((key, cartItem) {
      total += cartItem.price * cartItem.quantity;
    });
    return total;
  }

  void addItem(String productId, double price, String name) {
    if (_items.containsKey(productId)) {
      _items.update(
        productId,
        (existingCartItem) => CartItem(
          productId: existingCartItem.productId,
          name: existingCartItem.name,
          price: existingCartItem.price,
          quantity: existingCartItem.quantity + 1,
        ),
      );
    } else {
      _items.putIfAbsent(
        productId,
        () => CartItem(
          productId: productId,
          name: name,
          price: price,
          quantity: 1,
        ),
      );
    }
    notifyListeners();
  }

  void removeItem(String productId) {
    _items.remove(productId);
    notifyListeners();
  }

  void removeSingleItem(String productId) {
    if (!_items.containsKey(productId)) return;
    if (_items[productId]!.quantity > 1) {
      _items.update(
        productId,
        (existingCartItem) => CartItem(
          productId: existingCartItem.productId,
          name: existingCartItem.name,
          price: existingCartItem.price,
          quantity: existingCartItem.quantity - 1,
        ),
      );
    } else {
      _items.remove(productId);
    }
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }

  Future<bool> submitOrder(String storeId, String cashierId) async {
    // IMPORTANT: Remplacer par l'IP du serveur
    final url = Uri.parse('http://localhost:3003/api/v1/orders');
    
    final orderData = {
      'storeId': storeId,
      'cashierId': cashierId,
      'total': totalAmount,
      'type': 'DINE_IN',
      'paymentMode': 'ESPECES',
      'items': _items.values.map((item) => {
        'productId': item.productId,
        'quantity': item.quantity,
        'price': item.price,
      }).toList(),
    };

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode(orderData),
      );
      
      if (response.statusCode == 200) {
        clear();
        return true;
      }
      return false;
    } catch (e) {
      print('Erreur lors de la soumission: $e');
      return false;
    }
  }
}
