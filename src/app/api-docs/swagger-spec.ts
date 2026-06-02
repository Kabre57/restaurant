// src/app/api-docs/swagger-spec.ts
export const spec = {
  openapi: "3.1.0",
  info: {
    title: "Gourmet POS API",
    description: "Spécification complète et interactive des API du système de point de vente (POS) et de commande en ligne Gourmet. Supporte l'authentification par session, les webhooks tiers et les protocoles matériels réseau.",
    version: "1.0.0"
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Serveur de développement local"
    },
    {
      url: "https://www.parabellumpos.online",
      description: "Serveur de production principal"
    }
  ],
  paths: {
    "/api/orders": {
      get: {
        summary: "Liste des commandes du POS",
        description: "Récupère la liste filtrée des commandes du restaurant. Accès réservé aux rôles CASHIER, SERVER, RESTAURATEUR, ADMIN.",
        security: [{ CookieAuth: [] }],
        parameters: [
          {
            name: "storeId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "ID du magasin (isolation multi-tenant)."
          },
          {
            name: "status",
            in: "query",
            required: false,
            schema: {
              type: "string",
              enum: ["PENDING", "PREPARING", "READY", "PAID", "DELIVERED", "CANCELLED"]
            },
            description: "Filtrer par statut de commande."
          }
        ],
        responses: {
          "200": {
            description: "Liste des commandes récupérée avec succès.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Order" }
                }
              }
            }
          },
          "401": { description: "Non authentifié." },
          "429": { description: "Limite de requêtes dépassée (Rate limit)." }
        }
      },
      post: {
        summary: "Créer une commande en caisse (POS)",
        description: "Crée une nouvelle commande sur place, à emporter ou en livraison depuis la caisse tactile.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderCreateInput" }
            }
          }
        },
        responses: {
          "201": {
            description: "Commande créée avec succès.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" }
              }
            }
          },
          "400": { description: "Données d'entrée invalides (Zod error)." },
          "401": { description: "Non authentifié." }
        }
      }
    },
    "/api/orders/{id}/status": {
      post: {
        summary: "Mettre à jour le statut d'une commande",
        description: "Modifie le statut d'une commande et notifie en temps réel le KDS et l'interface client.",
        security: [{ CookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID de la commande."
          }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["PENDING", "PREPARING", "READY", "PAID", "DELIVERED", "CANCELLED"]
                  },
                  prepTime: {
                    type: "integer",
                    description: "Temps estimé de préparation en minutes."
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Statut mis à jour avec succès." },
          "400": { description: "Statut invalide." },
          "404": { description: "Commande non trouvée." }
        }
      }
    },
    "/api/orders/{id}/ticket": {
      get: {
        summary: "Payload d'impression du ticket de caisse",
        description: "Récupère la structure d'impression brute (au format ESC/POS) pour impression physique du reçu de commande.",
        security: [{ CookieAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "ID de la commande."
          }
        ],
        responses: {
          "200": {
            description: "Ticket généré avec succès.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TicketPayload" }
              }
            }
          }
        }
      }
    },
    "/api/v1/products": {
      get: {
        summary: "Liste publique des produits",
        description: "Récupère les produits du catalogue public (ex: pour affichage QR menu).",
        parameters: [
          {
            name: "storeId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "ID du restaurant."
          }
        ],
        responses: {
          "200": {
            description: "Succès.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Product" }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/categories": {
      get: {
        summary: "Liste publique des catégories",
        description: "Récupère les catégories publiques du restaurant.",
        parameters: [
          {
            name: "storeId",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "ID du restaurant."
          }
        ],
        responses: {
          "200": {
            description: "Succès.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Category" }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/orders": {
      post: {
        summary: "Prise de commande externe",
        description: "Soumet une commande externe (ex: depuis l'application mobile client ou le site web de commande).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PublicOrderInput" }
            }
          }
        },
        responses: {
          "201": {
            description: "Commande créée avec succès.",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Order" }
              }
            }
          },
          "400": { description: "Erreur de validation des données d'entrée." }
        }
      }
    },
    "/api/glovo-webhook": {
      post: {
        summary: "Injection de commandes Glovo",
        description: "Point d'entrée pour recevoir les commandes tierces en provenance de la plateforme Glovo.",
        security: [{ GlovoSignature: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["orderId", "storeId", "items"],
                properties: {
                  orderId: { type: "string" },
                  storeId: { type: "string" },
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        sku: { type: "string" },
                        quantity: { type: "integer" }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Commande Glovo injectée avec succès." },
          "401": { description: "Signature Glovo invalide." }
        }
      }
    },
    "/api/payments/mobile": {
      post: {
        summary: "Initier un paiement Mobile Money local",
        description: "Lance une transaction push STK (MTN, Orange, Wave) auprès des agrégateurs locaux de Côte d'Ivoire.",
        security: [{ CookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["orderId", "phoneNumber", "amount", "operator"],
                properties: {
                  orderId: { type: "string" },
                  phoneNumber: {
                    type: "string",
                    description: "Numéro au format local (ex: 0707XXXXXX)"
                  },
                  amount: { type: "number" },
                  operator: {
                    type: "string",
                    enum: ["MTN", "ORANGE", "WAVE"]
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Paiement initialisé. Réponse asynchrone attendue.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    transactionId: { type: "string" },
                    status: {
                      type: "string",
                      enum: ["PENDING", "SUCCESS", "FAILED"]
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/payments/mobile/notify": {
      post: {
        summary: "Callback de notification Mobile Money",
        description: "Point de terminaison asynchrone appelé par l'opérateur de paiement (MTN, Orange, Wave) pour notifier du statut final du paiement.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["transactionId", "status", "signature"],
                properties: {
                  transactionId: { type: "string" },
                  status: {
                    type: "string",
                    enum: ["SUCCESS", "FAILED"]
                  },
                  signature: {
                    type: "string",
                    description: "Signature cryptographique de sécurité pour valider la provenance de la notification."
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Notification reçue et validée." }
        }
      }
    },
    "/api/remote-order": {
      post: {
        summary: "Commande Kiosque sans caissier",
        description: "Traitement et enregistrement rapide d'une commande passée sur borne de commande interactive (Kiosque).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OrderCreateInput" }
            }
          }
        },
        responses: {
          "201": { description: "Commande Kiosque validée." }
        }
      }
    },
    "/api/tables": {
      get: {
        summary: "Liste des tables physiques",
        description: "Récupère la liste de toutes les tables du restaurant avec leur état d'occupation actuel.",
        security: [{ CookieAuth: [] }],
        parameters: [
          {
            name: "storeId",
            in: "query",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Succès.",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Table" }
                }
              }
            }
          }
        }
      }
    },
    "/api/tables/events": {
      get: {
        summary: "Flux SSE temps réel des tables",
        description: "Établit une connexion persistante Server-Sent Events (SSE) pour diffuser les changements d'état des tables en salle.",
        responses: {
          "200": {
            description: "Connexion SSE établie.",
            headers: {
              "Content-Type": {
                schema: { type: "string", example: "text/event-stream" }
              },
              "Cache-Control": {
                schema: { type: "string", example: "no-cache" }
              },
              "Connection": {
                schema: { type: "string", example: "keep-alive" }
              }
            }
          }
        }
      }
    },
    "/api/kds/stream": {
      get: {
        summary: "Flux SSE du Kitchen Display System",
        description: "Établit la connexion SSE pour diffuser en temps réel les nouvelles commandes à préparer en cuisine.",
        responses: {
          "200": { description: "Connexion SSE KDS établie." }
        }
      }
    },
    "/api/hardware/print": {
      post: {
        summary: "Envoyer une tâche d'impression",
        description: "Commande l'impression d'un ticket physique via l'imprimante réseau configurée (protocole ESC/POS).",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["printerIp", "payload"],
                properties: {
                  printerIp: { type: "string" },
                  payload: {
                    type: "string",
                    description: "Payload encodé ESC/POS."
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Impression lancée." }
        }
      }
    },
    "/api/hardware/cash-drawer": {
      post: {
        summary: "Ouvrir le tiroir-caisse",
        description: "Commande l'impulsion électrique d'ouverture du tiroir-caisse connecté à l'imprimante thermique.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["printerIp"],
                properties: {
                  printerIp: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Tiroir-caisse ouvert avec succès." }
        }
      }
    },
    "/api/hardware/payment-terminal": {
      post: {
        summary: "Réveiller le terminal de paiement (TPE)",
        description: "Initie la demande de paiement par carte bancaire sur le terminal physique connecté.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["terminalIp", "amount"],
                properties: {
                  terminalIp: { type: "string" },
                  amount: { type: "number" }
                }
              }
            }
          }
        },
        responses: {
          "200": { description: "Commande TPE lancée." }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      CookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "next-auth.session-token",
        description: "Authentification par cookie NextAuth.js"
      },
      GlovoSignature: {
        type: "apiKey",
        in: "header",
        name: "X-Glovo-Signature",
        description: "Signature HMAC cryptographique pour valider les requêtes de Glovo."
      }
    },
    schemas: {
      Order: {
        type: "object",
        properties: {
          id: { type: "string" },
          displayId: { type: "string" },
          storeId: { type: "string" },
          tableId: { type: "string", nullable: true },
          status: {
            type: "string",
            enum: ["PENDING", "PREPARING", "READY", "PAID", "DELIVERED", "CANCELLED"]
          },
          total: { type: "number" },
          tax: { type: "number" },
          discount: { type: "number" },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/OrderItem" }
          },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      OrderItem: {
        type: "object",
        properties: {
          id: { type: "string" },
          productId: { type: "string" },
          name: { type: "string" },
          price: { type: "number" },
          quantity: { type: "integer" },
          options: { type: "string", nullable: true }
        }
      },
      OrderCreateInput: {
        type: "object",
        required: ["storeId", "items", "total"],
        properties: {
          storeId: { type: "string" },
          tableId: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              required: ["productId", "quantity", "price"],
              properties: {
                productId: { type: "string" },
                quantity: { type: "integer" },
                price: { type: "number" },
                options: { type: "string" }
              }
            }
          },
          total: { type: "number" },
          tax: { type: "number" },
          discount: { type: "number" },
          customerPhone: { type: "string" }
        }
      },
      PublicOrderInput: {
        type: "object",
        required: ["storeId", "items", "customerPhone"],
        properties: {
          storeId: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                productId: { type: "string" },
                quantity: { type: "integer" }
              }
            }
          },
          customerPhone: { type: "string" },
          notes: { type: "string" }
        }
      },
      Product: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          price: { type: "number" },
          categoryId: { type: "string" },
          image: { type: "string", nullable: true }
        }
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          storeId: { type: "string" }
        }
      },
      Table: {
        type: "object",
        properties: {
          id: { type: "string" },
          number: { type: "integer" },
          status: {
            type: "string",
            enum: ["AVAILABLE", "OCCUPIED", "RESERVED"]
          },
          seats: { type: "integer" }
        }
      },
      TicketPayload: {
        type: "object",
        properties: {
          header: { type: "string" },
          items: {
            type: "array",
            items: { type: "string" }
          },
          footer: { type: "string" },
          rawEscPos: { type: "string" }
        }
      }
    }
  }
};
