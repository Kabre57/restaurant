import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("Starting Gyoza recipe seeding...")

  // 1. Get the first store
  const store = await prisma.store.findFirst()
  if (!store) {
    console.error("No store found in database. Please seed the store first.")
    return
  }
  const storeId = store.id
  console.log(`Using Store: ${store.name} (ID: ${storeId})`)

  // Drop the constraints if they exist so database doesn't complain about polymorphic references
  try {
    console.log("Dropping foreign key constraints on ProductIngredient table...")
    await prisma.$executeRawUnsafe('ALTER TABLE "ProductIngredient" DROP CONSTRAINT IF EXISTS "ProductIngredient_subRecipe_fkey";')
    await prisma.$executeRawUnsafe('ALTER TABLE "ProductIngredient" DROP CONSTRAINT IF EXISTS "ProductIngredient_baseIngredient_fkey";')
    console.log("Constraints dropped.")
  } catch (err) {
    console.warn("Could not drop constraints:", err)
  }

  // 2. Get or create category
  let category = await prisma.category.findFirst({
    where: { storeId }
  })
  if (!category) {
    category = await prisma.category.create({
      data: {
        storeId,
        name: "Entrées"
      }
    })
  }
  const categoryId = category.id

  // 3. Create raw ingredients
  const rawIngredientsData = [
    { name: "Farine", unit: "g", costPrice: 0.005 },
    { name: "Eau", unit: "cl", costPrice: 0.002 },
    { name: "Porc", unit: "g", costPrice: 0.012 },
    { name: "Chou", unit: "g", costPrice: 0.004 },
    { name: "Ail", unit: "g", costPrice: 0.015 },
    { name: "Gingembre", unit: "g", costPrice: 0.025 },
    { name: "Sauce soja", unit: "cl", costPrice: 0.15 },
    { name: "Huile", unit: "cl", costPrice: 0.08 },
    { name: "Sel", unit: "pincées", costPrice: 0.02 }
  ]

  const ingredientsMap: Record<string, string> = {}

  for (const item of rawIngredientsData) {
    let ing = await prisma.ingredient.findUnique({
      where: {
        storeId_name: {
          storeId,
          name: item.name
        }
      }
    })
    if (!ing) {
      ing = await prisma.ingredient.create({
        data: {
          storeId,
          name: item.name,
          unit: item.unit,
          costPrice: item.costPrice
        }
      })
    }
    ingredientsMap[item.name] = ing.id

    // Ensure inventory exists with plenty of stock
    const inv = await prisma.inventory.findUnique({
      where: {
        storeId_ingredientId: {
          storeId,
          ingredientId: ing.id
        }
      }
    })
    if (!inv) {
      await prisma.inventory.create({
        data: {
          storeId,
          ingredientId: ing.id,
          quantity: 10000,
          minStock: 100
        }
      })
    } else {
      await prisma.inventory.update({
        where: { id: inv.id },
        data: { quantity: 10000 }
      })
    }
  }

  // 4. Create sub-recipes (as Products)
  const productsToCreate = [
    { name: "Préparation A", price: 0, description: "Mélange aromatique d'ail, gingembre et soja", isRecipe: true },
    { name: "Farce", price: 0, description: "Farce à base de porc et chou assaisonné", isRecipe: true },
    { name: "Pâte à gyozas", price: 0, description: "Pâte fine de farine et eau reposée", isRecipe: true },
    { name: "Gyoza final", price: 2500, description: "Véritables raviolis japonais de A à Z", isRecipe: true }
  ]

  const productsMap: Record<string, string> = {}

  for (const item of productsToCreate) {
    let prod = await prisma.product.findFirst({
      where: {
        storeId,
        name: item.name
      }
    })
    if (!prod) {
      prod = await prisma.product.create({
        data: {
          storeId,
          categoryId,
          name: item.name,
          price: item.price,
          description: item.description,
          trackStock: false,
          stockQuantity: 0
        }
      })
    }
    productsMap[item.name] = prod.id
  }

  // 5. Clean up old recipe mappings for these products
  await prisma.productIngredient.deleteMany({
    where: {
      productId: {
        in: Object.values(productsMap)
      }
    }
  })

  // 6. Seed Recipe Items

  // Recette "Préparation A" : Composée d’ail, gingembre, sauce soja, huile.
  const prepARecipe = [
    { ingredientId: ingredientsMap["Ail"], quantity: 10, unit: "g", isSubRecipe: false, sectionGroup: "Ingrédients principaux", preparationNote: "Hacher finement" },
    { ingredientId: ingredientsMap["Gingembre"], quantity: 5, unit: "g", isSubRecipe: false, sectionGroup: "Ingrédients principaux", preparationNote: "Râper finement" },
    { ingredientId: ingredientsMap["Sauce soja"], quantity: 2, unit: "cl", isSubRecipe: false, sectionGroup: "Ingrédients principaux", preparationNote: "Ajouter au mélange" },
    { ingredientId: ingredientsMap["Huile"], quantity: 2, unit: "cl", isSubRecipe: false, sectionGroup: "Ingrédients principaux", preparationNote: "Ajouter pour lier" }
  ]
  await prisma.productIngredient.createMany({
    data: prepARecipe.map((item, idx) => ({
      productId: productsMap["Préparation A"],
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      isSubRecipe: item.isSubRecipe,
      sectionGroup: item.sectionGroup,
      preparationNote: item.preparationNote,
      displayOrder: idx
    }))
  })

  // Recette "Farce" : Contient porc, chou, sel, et la sous-recette "Préparation A".
  const farceRecipe = [
    { ingredientId: ingredientsMap["Porc"], quantity: 250, unit: "g", isSubRecipe: false, sectionGroup: "Ingrédients principaux", preparationNote: "Hacher menu" },
    { ingredientId: ingredientsMap["Chou"], quantity: 100, unit: "g", isSubRecipe: false, sectionGroup: "Ingrédients principaux", preparationNote: "Émincer et dégorger" },
    { ingredientId: ingredientsMap["Sel"], quantity: 2, unit: "pincées", isSubRecipe: false, sectionGroup: "Ingrédients principaux", preparationNote: "Saupoudrer pour assaisonner" },
    { ingredientId: productsMap["Préparation A"], quantity: 1, unit: "portions", isSubRecipe: true, sectionGroup: "Ingrédients principaux", preparationNote: "Intégrer la préparation aromatique" }
  ]
  await prisma.productIngredient.createMany({
    data: farceRecipe.map((item, idx) => ({
      productId: productsMap["Farce"],
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      isSubRecipe: item.isSubRecipe,
      sectionGroup: item.sectionGroup,
      preparationNote: item.preparationNote,
      displayOrder: idx
    }))
  })

  // Recette "Pâte à gyozas" : Contient farine, eau.
  const pateRecipe = [
    { ingredientId: ingredientsMap["Farine"], quantity: 400, unit: "g", isSubRecipe: false, sectionGroup: "Ingrédients principaux", preparationNote: "Tamiser dans un saladier" },
    { ingredientId: ingredientsMap["Eau"], quantity: 50, unit: "cl", isSubRecipe: false, sectionGroup: "Ingrédients principaux", preparationNote: "Verser progressivement et pétrir" }
  ]
  await prisma.productIngredient.createMany({
    data: pateRecipe.map((item, idx) => ({
      productId: productsMap["Pâte à gyozas"],
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      isSubRecipe: item.isSubRecipe,
      sectionGroup: item.sectionGroup,
      preparationNote: item.preparationNote,
      displayOrder: idx
    }))
  })

  // Recette "Gyoza final" : Deux groupes ("Pâte", "Farce") contenant respectivement la sous-recette "Pâte à gyozas" et la recette "Farce".
  const gyozaFinalRecipe = [
    { ingredientId: productsMap["Pâte à gyozas"], quantity: 1, unit: "portions", isSubRecipe: true, sectionGroup: "Pâte", preparationNote: "Étaler finement en disques de 8cm" },
    { ingredientId: productsMap["Farce"], quantity: 1, unit: "portions", isSubRecipe: true, sectionGroup: "Farce", preparationNote: "Placer une cuillère de farce au centre et plier en demi-lune" }
  ]
  await prisma.productIngredient.createMany({
    data: gyozaFinalRecipe.map((item, idx) => ({
      productId: productsMap["Gyoza final"],
      ingredientId: item.ingredientId,
      quantity: item.quantity,
      unit: item.unit,
      isSubRecipe: item.isSubRecipe,
      sectionGroup: item.sectionGroup,
      preparationNote: item.preparationNote,
      displayOrder: idx
    }))
  })

  console.log("Gyoza recipe seeding successfully completed!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
