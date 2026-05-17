import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';

class CartScreen extends StatefulWidget {
  final String storeId;
  const CartScreen({super.key, required this.storeId});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    final cart = Provider.of<CartProvider>(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Panier', style: TextStyle(fontWeight: FontWeight.w900)),
        centerTitle: true,
      ),
      body: cart.items.isEmpty
          ? const Center(
              child: Text(
                'Votre panier est vide',
                style: TextStyle(fontSize: 18, color: Colors.grey),
              ),
            )
          : Column(
              children: [
                Expanded(
                  child: ListView.builder(
                    itemCount: cart.items.length,
                    itemBuilder: (context, i) {
                      final item = cart.items.values.toList()[i];
                      return Card(
                        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        child: ListTile(
                          title: Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Text('Total: ${(item.price * item.quantity).toStringAsFixed(0)} FCFA'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, color: Colors.amber),
                                onPressed: () => cart.removeSingleItem(item.productId),
                              ),
                              Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline, color: Colors.amber),
                                onPressed: () => cart.addItem(item.productId, item.price, item.name),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade900,
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 10, offset: const Offset(0, -5))
                    ]
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total:', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                          Text(
                            '${cart.totalAmount.toStringAsFixed(0)} FCFA',
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.amber),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      _isLoading
                          ? const CircularProgressIndicator(color: Colors.amber)
                          : ElevatedButton(
                              onPressed: () async {
                                setState(() { _isLoading = true; });
                                
                                // ID du caissier factice (à remplacer par le vrai user connecté)
                                final cashierId = 'user_cashier_123'; 
                                
                                final success = await cart.submitOrder(widget.storeId, cashierId);
                                
                                setState(() { _isLoading = false; });
                                
                                if (success) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Commande envoyée en cuisine avec succès !', style: TextStyle(color: Colors.white)), backgroundColor: Colors.green),
                                  );
                                  Navigator.of(context).pop(); // Retour aux catégories
                                } else {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Erreur lors de l\'envoi de la commande.'), backgroundColor: Colors.red),
                                  );
                                }
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.amber,
                                foregroundColor: Colors.black,
                                minimumSize: const Size(double.infinity, 50),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                )
                              ),
                              child: const Text('ENCAISSER & ENVOYER EN CUISINE', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                            ),
                    ],
                  ),
                )
              ],
            ),
    );
  }
}
