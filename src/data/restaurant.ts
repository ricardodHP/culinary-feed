import tacosPastor from "@/assets/dishes/tacos-pastor.jpg";
import enchiladas from "@/assets/dishes/enchiladas.jpg";
import guacamole from "@/assets/dishes/guacamole.jpg";
import aguaFresca from "@/assets/dishes/agua-fresca.jpg";
import carneAsada from "@/assets/dishes/carne-asada.jpg";
import churros from "@/assets/dishes/churros.jpg";
import pozole from "@/assets/dishes/pozole.jpg";
import quesadillas from "@/assets/dishes/quesadillas.jpg";
import elote from "@/assets/dishes/elote.jpg";
import mole from "@/assets/dishes/mole.jpg";
import margarita from "@/assets/dishes/margarita.jpg";

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  likes: number;
  tags: string[];
}

export interface Category {
  id: string;
  name: string;
  image: string;
  emoji: string;
}

export const categories: Category[] = [
  { id: "populares", name: "Populares", image: tacosPastor, emoji: "🔥" },
  { id: "entradas", name: "Entradas", image: guacamole, emoji: "🥑" },
  { id: "carnes", name: "Carnes", image: carneAsada, emoji: "🥩" },
  { id: "sopas", name: "Sopas", image: pozole, emoji: "🍲" },
  { id: "postres", name: "Postres", image: churros, emoji: "🍮" },
  { id: "bebidas", name: "Bebidas", image: margarita, emoji: "🍹" },
];

export const dishes: Dish[] = [
  {
    id: "1",
    name: "Tacos al Pastor",
    description: "Deliciosos tacos de cerdo marinado con piña, cilantro y cebolla. Servidos en tortilla de maíz con salsa verde.",
    price: 85,
    image: tacosPastor,
    category: "populares",
    rating: 4.9,
    likes: 342,
    tags: ["Best Seller", "Spicy"],
  },
  {
    id: "2",
    name: "Enchiladas Rojas",
    description: "Tortillas rellenas de pollo bañadas en salsa roja, cubiertas con crema y queso fresco. Acompañadas de arroz y frijoles.",
    price: 120,
    image: enchiladas,
    category: "populares",
    rating: 4.7,
    likes: 218,
    tags: ["Popular"],
  },
  {
    id: "3",
    name: "Guacamole Fresco",
    description: "Aguacate machacado con jitomate, cebolla, cilantro y chile serrano. Servido con totopos de maíz recién hechos.",
    price: 75,
    image: guacamole,
    category: "entradas",
    rating: 4.8,
    likes: 187,
    tags: ["Vegetarian"],
  },
  {
    id: "4",
    name: "Carne Asada",
    description: "Corte de res a la parrilla con cebollitas cambray, nopales y guacamole. Acompañada de tortillas de harina.",
    price: 195,
    image: carneAsada,
    category: "carnes",
    rating: 4.9,
    likes: 276,
    tags: ["Premium", "Best Seller"],
  },
  {
    id: "5",
    name: "Churros con Chocolate",
    description: "Churros crujientes espolvoreados con azúcar y canela, acompañados de chocolate caliente para dip.",
    price: 65,
    image: churros,
    category: "postres",
    rating: 4.6,
    likes: 156,
    tags: ["Sweet"],
  },
  {
    id: "6",
    name: "Pozole Rojo",
    description: "Caldo tradicional de maíz cacahuazintle con carne de cerdo en salsa roja. Servido con rábano, lechuga y orégano.",
    price: 110,
    image: pozole,
    category: "sopas",
    rating: 4.8,
    likes: 198,
    tags: ["Traditional"],
  },
  {
    id: "7",
    name: "Quesadillas de Huitlacoche",
    description: "Tortillas de maíz rellenas de huitlacoche y queso Oaxaca, acompañadas de salsa verde y crema.",
    price: 90,
    image: quesadillas,
    category: "entradas",
    rating: 4.5,
    likes: 134,
    tags: ["Vegetarian"],
  },
  {
    id: "8",
    name: "Elote Preparado",
    description: "Mazorca de maíz asada con mayonesa, queso cotija, chile en polvo y limón. Un clásico mexicano.",
    price: 45,
    image: elote,
    category: "entradas",
    rating: 4.7,
    likes: 203,
    tags: ["Street Food"],
  },
  {
    id: "9",
    name: "Mole Poblano",
    description: "Pollo bañado en auténtico mole poblano con ajonjolí. Una receta ancestral con más de 20 ingredientes.",
    price: 145,
    image: mole,
    category: "carnes",
    rating: 4.9,
    likes: 289,
    tags: ["Traditional", "Premium"],
  },
  {
    id: "10",
    name: "Agua Fresca de Frutas",
    description: "Refrescante agua de frutas naturales del día. Opciones: jamaica, horchata, tamarindo o limón.",
    price: 35,
    image: aguaFresca,
    category: "bebidas",
    rating: 4.4,
    likes: 122,
    tags: ["Refreshing"],
  },
  {
    id: "11",
    name: "Margarita Clásica",
    description: "Cóctel tradicional con tequila, triple sec y jugo de limón. Servida con sal en el borde del vaso.",
    price: 95,
    image: margarita,
    category: "bebidas",
    rating: 4.6,
    likes: 167,
    tags: ["Cocktail"],
  },
];

export const restaurantInfo = {
  name: "La Casa del Sabor",
  username: "lacasadelsabor",
  bio: "🌮 Auténtica cocina mexicana desde 1985\n📍 Col. Roma Norte, CDMX\n⏰ Lun-Dom 12:00 - 23:00\n🏆 #1 en comida mexicana",
  posts: dishes.length,
  followers: "12.4K",
  following: 86,
  whatsappLink: "https://wa.me/5215512345678",
  instagramLink: "https://instagram.com/lacasadelsabor",
};
