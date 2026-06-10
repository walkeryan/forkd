// Dish suggestion banks for the meal-logging flow.
//
// `getMenuSuggestions` fuzzy-matches a place name against known chains and
// returns a curated list of menu items. When no chain matches, it falls back
// to a bank keyed off the place's cuisine type. Everything here is hardcoded —
// no network calls — so suggestions are instant and work offline.

/** Per-chain menus. Keys are canonical display names. */
const CHAIN_MENUS: Record<string, string[]> = {
  "McDonald's": [
    'Big Mac', 'Quarter Pounder with Cheese', 'McDouble', 'Cheeseburger',
    'McChicken', 'McNuggets (10 pc)', 'Filet-O-Fish', 'Egg McMuffin',
    'Sausage McMuffin', 'Hash Browns', 'World Famous Fries', 'Apple Pie',
    'McFlurry (Oreo)', 'Vanilla Cone', 'Iced Coffee', 'Sausage Burrito',
  ],
  'Burger King': [
    'Whopper', 'Double Whopper', 'Bacon King', 'Impossible Whopper',
    'Original Chicken Sandwich', 'Chicken Fries', 'Chicken Nuggets (8 pc)',
    'Cheeseburger', 'Bacon Cheeseburger', 'French Fries', 'Onion Rings',
    'Mozzarella Sticks', 'Croissan’wich', 'Hash Browns', 'Hershey’s Sundae Pie',
    'Soft Serve Cone',
  ],
  "Wendy's": [
    "Dave's Single", "Dave's Double", 'Baconator', 'Son of Baconator',
    'Spicy Chicken Sandwich', 'Grilled Chicken Sandwich', 'Crispy Chicken Sandwich',
    'Chicken Nuggets (10 pc)', 'Spicy Nuggets', 'Natural-Cut Fries', 'Chili',
    'Baconator Fries', 'Frosty (Chocolate)', 'Frosty (Vanilla)',
    'Apple Pecan Salad', 'Jr. Bacon Cheeseburger',
  ],
  'Chick-fil-A': [
    'Chick-fil-A Chicken Sandwich', 'Spicy Chicken Sandwich', 'Deluxe Sandwich',
    'Chicken Nuggets (12 pc)', 'Grilled Nuggets', 'Chick-n-Strips',
    'Spicy Chicken Biscuit', 'Chicken Biscuit', 'Waffle Potato Fries',
    'Mac & Cheese', 'Cobb Salad', 'Grilled Chicken Sandwich', 'Chicken Wrap',
    'Frosted Lemonade', 'Chocolate Chunk Cookie', 'Hash Brown Scramble Bowl',
  ],
  'Taco Bell': [
    'Crunchwrap Supreme', 'Crunchy Taco', 'Soft Taco', 'Doritos Locos Tacos',
    'Quesadilla', 'Chalupa Supreme', 'Burrito Supreme', 'Bean Burrito',
    'Cheesy Gordita Crunch', 'Nachos BellGrande', 'Cheesy Fiesta Potatoes',
    'Mexican Pizza', 'Cinnamon Twists', 'Quesarito', 'Black Bean Crunchwrap',
    'Cheese Roll-Up',
  ],
  'Chipotle': [
    'Chicken Burrito', 'Steak Burrito', 'Carnitas Burrito', 'Barbacoa Burrito',
    'Sofritas Burrito', 'Chicken Bowl', 'Steak Bowl', 'Carnitas Bowl',
    'Veggie Bowl', 'Chicken Quesadilla', 'Chicken Tacos', 'Steak Tacos',
    'Chips & Guacamole', 'Chips & Queso', 'Salad Bowl', 'Kids Quesadilla',
  ],
  'Subway': [
    'Italian B.M.T.', 'Spicy Italian', 'Meatball Marinara', 'Turkey Breast',
    'Tuna', 'Black Forest Ham', 'Steak & Cheese', 'Sweet Onion Chicken Teriyaki',
    'Oven Roasted Chicken', 'Cold Cut Combo', 'Veggie Delite', 'Buffalo Chicken',
    'Rotisserie-Style Chicken', 'Chicken & Bacon Ranch', 'Footlong Cookie',
    'Chocolate Chip Cookie',
  ],
  'Starbucks': [
    'Caffè Latte', 'Caramel Macchiato', 'Cappuccino', 'Caffè Americano',
    'Flat White', 'Pike Place Roast', 'Cold Brew', 'Iced Caramel Macchiato',
    'Pumpkin Spice Latte', 'White Chocolate Mocha', 'Caffè Mocha',
    'Vanilla Sweet Cream Cold Brew', 'Chai Tea Latte', 'Green Tea Frappuccino',
    'Caramel Frappuccino', 'Bacon Gouda Sandwich',
  ],
  "Dunkin'": [
    'Original Blend Coffee', 'Iced Coffee', 'Caramel Iced Coffee', 'Latte',
    'Cappuccino', 'Iced Latte', 'Frozen Coffee', 'Glazed Donut',
    'Boston Kreme Donut', 'Chocolate Frosted Donut', 'Munchkins',
    'Bacon Egg & Cheese', 'Sausage Egg & Cheese', 'Hash Browns',
    'Everything Bagel with Cream Cheese', 'Coolatta',
  ],
  "Domino's": [
    'Pepperoni Pizza', 'Cheese Pizza', 'ExtravaganZZa Pizza', 'MeatZZa Pizza',
    'Pacific Veggie Pizza', 'Philly Cheese Steak Pizza', 'Buffalo Chicken Pizza',
    'Handmade Pan Pizza', 'Stuffed Cheesy Bread', 'Garlic Bread Twists',
    'Boneless Chicken', 'Chicken Wings', 'Cheesy Bread', 'Chocolate Lava Crunch Cake',
    'Marbled Cookie Brownie', 'Parmesan Bread Bites',
  ],
  'Pizza Hut': [
    'Pepperoni Lover’s Pizza', 'Meat Lover’s Pizza', 'Supreme Pizza',
    'Veggie Lover’s Pizza', 'Hawaiian Chicken Pizza', 'BBQ Chicken Pizza',
    'Original Pan Pizza', 'Thin ’N Crispy Pizza', 'Stuffed Crust Pizza',
    'Breadsticks', 'Cheese Sticks', 'Garlic Knots', 'Traditional Wings',
    'Cinnamon Sticks', 'Hershey’s Cookie', 'Personal Pan Pizza',
  ],
  'Panera Bread': [
    'Broccoli Cheddar Soup', 'Creamy Tomato Soup', 'Mac & Cheese',
    'Bacon Turkey Bravo', 'Chipotle Chicken Avocado Melt', 'Napa Almond Chicken Salad',
    'Caesar Salad', 'Greek Salad', 'Fuji Apple Salad', 'You Pick Two',
    'Cinnamon Crunch Bagel', 'Avocado Egg White Sandwich', 'Mediterranean Veggie Sandwich',
    'Steak & White Cheddar Panini', 'Chocolate Chipper Cookie', 'Frozen Caramel Cold Brew',
  ],
  'Five Guys': [
    'Hamburger', 'Cheeseburger', 'Bacon Cheeseburger', 'Little Hamburger',
    'Little Cheeseburger', 'Bacon Burger', 'Hot Dog', 'Cheese Dog',
    'Bacon Dog', 'Grilled Cheese', 'Veggie Sandwich', 'Five Guys Fries',
    'Cajun Fries', 'Little Fries', 'Vanilla Milkshake', 'Chocolate Milkshake',
  ],
  'Shake Shack': [
    'ShackBurger', 'SmokeShack', 'Double ShackBurger', 'Hamburger',
    'Cheeseburger', 'Shack Stack', 'Chicken Shack', 'Hot Chicken',
    'Avocado Bacon Burger', 'Crinkle Cut Fries', 'Cheese Fries', 'Shack-cago Dog',
    'Vanilla Shake', 'Chocolate Shake', 'Black & White Shake', 'Cheese Dog',
  ],
  'Popeyes': [
    'Spicy Chicken Sandwich', 'Classic Chicken Sandwich', 'Bonafide Chicken (Mild)',
    'Bonafide Chicken (Spicy)', 'Chicken Tenders', 'Handcrafted Tenders',
    'Cajun Fries', 'Red Beans & Rice', 'Mac & Cheese', 'Mashed Potatoes with Gravy',
    'Biscuits', 'Shrimp Tackle Box', 'Popcorn Shrimp', 'Cole Slaw',
    'Blackened Tenders', 'Apple Pie',
  ],
  'KFC': [
    'Original Recipe Chicken', 'Extra Crispy Chicken', 'Kentucky Fried Chicken Bucket',
    'Chicken Tenders', 'Spicy Chicken Sandwich', 'Famous Bowl', 'Popcorn Chicken',
    'Nashville Hot Chicken', 'Mashed Potatoes & Gravy', 'Mac & Cheese',
    'Cole Slaw', 'Biscuits', 'Mac & Cheese Bowl', 'Pot Pie',
    'Secret Recipe Fries', 'Chocolate Chip Cookie',
  ],
  'Wingstop': [
    'Original Hot Wings', 'Louisiana Rub Wings', 'Lemon Pepper Wings',
    'Garlic Parmesan Wings', 'Hickory Smoked BBQ Wings', 'Mango Habanero Wings',
    'Atomic Wings', 'Hawaiian Wings', 'Cajun Wings', 'Boneless Wings',
    'Chicken Tenders', 'Louisiana Voodoo Fries', 'Cajun Fried Corn',
    'Seasoned Fries', 'Buffalo Ranch Fries', 'Cheese Sauce',
  ],
  'Buffalo Wild Wings': [
    'Traditional Wings', 'Boneless Wings', 'Buffalo Blasts', 'Ultimate Nachos',
    'Mozzarella Sticks', 'Cheese Curds', 'Chicken Tenders', 'Buffalo Ranch Chicken Wrap',
    'All-American Cheeseburger', 'Street Tacos', 'Loaded Ranch Fries',
    'Onion Rings', 'Honey BBQ Wings', 'Asian Zing Wings', 'Mango Habanero Wings',
    'Garlic Parmesan Wings',
  ],
  'Olive Garden': [
    'Chicken Alfredo', 'Fettuccine Alfredo', 'Chicken Parmigiana', 'Lasagna Classico',
    'Shrimp Alfredo', 'Spaghetti & Meatballs', 'Five Cheese Ziti al Forno',
    'Tour of Italy', 'Chicken & Shrimp Carbonara', 'Eggplant Parmigiana',
    'Zuppa Toscana', 'Minestrone Soup', 'Breadsticks', 'Salad',
    'Stuffed Ravioli', 'Tiramisu',
  ],
  "Applebee's": [
    'Riblets Platter', 'Bourbon Street Chicken & Shrimp', 'Fiesta Lime Chicken',
    'Classic Bacon Cheeseburger', 'Quesadilla Burger', 'Oriental Chicken Salad',
    'Spinach & Artichoke Dip', 'Mozzarella Sticks', 'Boneless Wings',
    'Chicken Tenders Platter', 'Double-Glazed Baby Back Ribs', 'Fiesta Chicken Chopped Salad',
    'Three Cheese Chicken Penne', 'Whisky Bacon Burger', 'Blondie Dessert', 'Chicken Wonton Tacos',
  ],
  "Chili's": [
    'Baby Back Ribs', 'Classic Bacon Burger', 'Oldtimer Burger', 'Fajitas (Chicken)',
    'Fajitas (Steak)', 'Chicken Crispers', 'Cajun Chicken Pasta', 'Big Mouth Bites',
    'Southwest Eggrolls', 'Skillet Queso', 'Texas Cheese Fries', 'Santa Fe Chicken Quesadilla',
    'Triple Dipper', 'Molten Chocolate Cake', 'Boneless Wings', 'Chips & Salsa',
  ],
  'IHOP': [
    'Original Buttermilk Pancakes', 'Chocolate Chip Pancakes', 'New York Cheesecake Pancakes',
    'Belgian Waffle', 'French Toast', 'Breakfast Sampler', 'Colorado Omelette',
    'Big Steak Omelette', 'Bacon & Eggs', 'Hash Browns', 'Stuffed French Toast',
    'Chicken & Waffles', 'Country Fried Steak', 'Sirloin Steak Tips',
    'Crispy Chicken Strips', 'Cinnamon Roll Pancakes',
  ],
  "Denny's": [
    'Grand Slam', 'Build Your Own Grand Slam', 'Lumberjack Slam', 'Moons Over My Hammy',
    'Buttermilk Pancakes', 'French Toast Slam', 'Country-Fried Steak & Eggs',
    'Santa Fe Sizzlin’ Skillet', 'Bacon Avocado Cheeseburger', 'The Super Bird Sandwich',
    'Chicken Strips', 'T-Bone Steak & Eggs', 'Hash Browns', 'Sirloin Steak',
    'Premium Chicken Tenders', 'Salted Caramel Cookie Skillet',
  ],
  'Texas Roadhouse': [
    'Fall-Off-The-Bone Ribs', 'Bone-In Ribeye', 'Dallas Filet', 'New York Strip',
    'Sirloin Steak', 'Country Fried Sirloin', 'Grilled BBQ Chicken', 'Pulled Pork',
    'Texas Red Chili', 'Cactus Blossom', 'Rattlesnake Bites', 'Fried Pickles',
    'Loaded Sweet Potato', 'Cinnamon Honey Butter Rolls', 'Grilled Salmon',
    'Big Ol’ Brownie',
  ],
  'Outback Steakhouse': [
    'Bloomin’ Onion', 'Outback Center-Cut Sirloin', 'Bone-In Ribeye', 'Victoria’s Filet Mignon',
    'Outback Special Sirloin', 'Prime Rib', 'Alice Springs Chicken', 'Baby Back Ribs',
    'Grilled Shrimp on the Barbie', 'Coconut Shrimp', 'Aussie Cheese Fries',
    'Chicken Tenders', 'Grilled Salmon', 'Queensland Salad', 'Baked Potato',
    'Chocolate Thunder from Down Under',
  ],
  'Cheesecake Factory': [
    'Original Cheesecake', 'Oreo Dream Extreme Cheesecake', 'Avocado Egg Rolls',
    'Tex Mex Eggrolls', 'Chicken Madeira', 'Louisiana Chicken Pasta',
    'Pasta Carbonara', 'Shrimp Scampi', 'Fettuccini Alfredo', 'Factory Burrito Grande',
    'Bang-Bang Chicken & Shrimp', 'Crispy Chicken Costoletta', 'Spicy Cashew Chicken',
    'Thai Lettuce Wraps', 'Fish & Chips', 'Godiva Chocolate Cheesecake',
  ],
  'Panda Express': [
    'Orange Chicken', 'Beijing Beef', 'Broccoli Beef', 'Kung Pao Chicken',
    'Honey Walnut Shrimp', 'Grilled Teriyaki Chicken', 'Mushroom Chicken',
    'SweetFire Chicken Breast', 'Black Pepper Chicken', 'String Bean Chicken Breast',
    'Honey Sesame Chicken Breast', 'Chow Mein', 'Fried Rice', 'White Steamed Rice',
    'Cream Cheese Rangoon', 'Veggie Spring Roll',
  ],
}

/**
 * Extra normalized aliases for chains whose name doesn't reduce cleanly to its
 * canonical key (e.g. nicknames or "and" → "&"). Values are canonical keys.
 */
const CHAIN_ALIASES: Record<string, string> = {
  mcdonalds: "McDonald's",
  mcds: "McDonald's",
  bk: 'Burger King',
  wendys: "Wendy's",
  chickfila: 'Chick-fil-A',
  chickfilet: 'Chick-fil-A',
  tacobell: 'Taco Bell',
  dunkindonuts: "Dunkin'",
  dunkin: "Dunkin'",
  dominos: "Domino's",
  dominospizza: "Domino's",
  pizzahut: 'Pizza Hut',
  panera: 'Panera Bread',
  fiveguys: 'Five Guys',
  shakeshack: 'Shake Shack',
  bww: 'Buffalo Wild Wings',
  buffalowildwings: 'Buffalo Wild Wings',
  bdubs: 'Buffalo Wild Wings',
  olivegarden: 'Olive Garden',
  applebees: "Applebee's",
  chilis: "Chili's",
  dennys: "Denny's",
  texasroadhouse: 'Texas Roadhouse',
  outback: 'Outback Steakhouse',
  outbacksteakhouse: 'Outback Steakhouse',
  cheesecakefactory: 'Cheesecake Factory',
  thecheesecakefactory: 'Cheesecake Factory',
  pandaexpress: 'Panda Express',
  panda: 'Panda Express',
  kfc: 'KFC',
  kentuckyfriedchicken: 'KFC',
}

/** Cuisine-type fallback banks (used when no chain matches). */
const CUISINE_MENUS: Record<string, string[]> = {
  american: [
    'Cheeseburger', 'Bacon Cheeseburger', 'BLT Sandwich', 'Club Sandwich',
    'Buffalo Wings', 'Mac & Cheese', 'Loaded Fries', 'Chicken Tenders',
    'Caesar Salad', 'Cobb Salad', 'Patty Melt', 'Grilled Cheese',
    'Meatloaf', 'Pot Roast', 'Pulled Pork Sandwich', 'Onion Rings',
  ],
  italian: [
    'Spaghetti Carbonara', 'Fettuccine Alfredo', 'Lasagna', 'Margherita Pizza',
    'Chicken Parmigiana', 'Eggplant Parmigiana', 'Spaghetti & Meatballs',
    'Penne alla Vodka', 'Risotto', 'Gnocchi', 'Ravioli', 'Bruschetta',
    'Caprese Salad', 'Minestrone Soup', 'Tiramisu', 'Cannoli',
  ],
  mexican: [
    'Tacos al Pastor', 'Carne Asada Tacos', 'Chicken Enchiladas', 'Cheese Quesadilla',
    'Beef Burrito', 'Chicken Fajitas', 'Carnitas', 'Chiles Rellenos',
    'Guacamole & Chips', 'Nachos', 'Tamales', 'Pozole',
    'Elote (Street Corn)', 'Carne Asada', 'Churros', 'Horchata',
  ],
  chinese: [
    'Orange Chicken', 'Kung Pao Chicken', 'General Tso’s Chicken', 'Beef & Broccoli',
    'Sweet & Sour Pork', 'Mapo Tofu', 'Egg Fried Rice', 'Chow Mein',
    'Lo Mein', 'Wonton Soup', 'Hot & Sour Soup', 'Spring Rolls',
    'Pork Dumplings', 'Honey Walnut Shrimp', 'Sesame Chicken', 'Egg Drop Soup',
  ],
  japanese: [
    'California Roll', 'Spicy Tuna Roll', 'Salmon Nigiri', 'Tuna Sashimi',
    'Chicken Teriyaki', 'Chicken Katsu', 'Tonkotsu Ramen', 'Shoyu Ramen',
    'Tempura Udon', 'Gyoza', 'Edamame', 'Miso Soup',
    'Chicken Karaage', 'Unagi Don', 'Dragon Roll', 'Beef Yakisoba',
  ],
  thai: [
    'Pad Thai', 'Pad See Ew', 'Drunken Noodles', 'Green Curry',
    'Red Curry', 'Massaman Curry', 'Panang Curry', 'Tom Yum Soup',
    'Tom Kha Gai', 'Thai Fried Rice', 'Pineapple Fried Rice', 'Spring Rolls',
    'Satay Skewers', 'Papaya Salad', 'Larb', 'Mango Sticky Rice',
  ],
  indian: [
    'Chicken Tikka Masala', 'Butter Chicken', 'Chicken Vindaloo', 'Lamb Rogan Josh',
    'Palak Paneer', 'Saag Paneer', 'Chana Masala', 'Dal Makhani',
    'Chicken Biryani', 'Vegetable Biryani', 'Garlic Naan', 'Samosa',
    'Tandoori Chicken', 'Aloo Gobi', 'Mango Lassi', 'Gulab Jamun',
  ],
  greek: [
    'Chicken Gyro', 'Lamb Gyro', 'Chicken Souvlaki', 'Pork Souvlaki',
    'Greek Salad', 'Spanakopita', 'Moussaka', 'Pastitsio',
    'Dolmades', 'Tzatziki & Pita', 'Hummus', 'Falafel',
    'Saganaki', 'Lamb Chops', 'Baklava', 'Avgolemono Soup',
  ],
  korean: [
    'Bulgogi', 'Bibimbap', 'Korean Fried Chicken', 'Galbi (Short Ribs)',
    'Japchae', 'Kimchi Fried Rice', 'Tteokbokki', 'Sundubu Jjigae',
    'Kimchi Jjigae', 'Pork Belly (Samgyeopsal)', 'Spicy Pork Bulgogi', 'Mandu',
    'Korean BBQ Beef', 'Bibim Naengmyeon', 'Kimchi', 'Hotteok',
  ],
  vietnamese: [
    'Pho Bo (Beef Pho)', 'Pho Ga (Chicken Pho)', 'Banh Mi', 'Grilled Pork Banh Mi',
    'Bun Cha', 'Vermicelli Bowl', 'Spring Rolls (Goi Cuon)', 'Fried Egg Rolls',
    'Lemongrass Chicken', 'Shaking Beef (Bo Luc Lac)', 'Com Tam (Broken Rice)',
    'Banh Xeo', 'Vietnamese Iced Coffee', 'Hu Tieu', 'Caramel Clay Pot Fish', 'Che Dessert',
  ],
  bbq: [
    'Brisket', 'Pulled Pork', 'Baby Back Ribs', 'Spare Ribs',
    'Smoked Sausage', 'Burnt Ends', 'Smoked Chicken', 'Pulled Pork Sandwich',
    'Brisket Sandwich', 'Beef Ribs', 'Mac & Cheese', 'Baked Beans',
    'Coleslaw', 'Cornbread', 'Collard Greens', 'Banana Pudding',
  ],
  seafood: [
    'Fish & Chips', 'Grilled Salmon', 'Shrimp Scampi', 'Fried Shrimp',
    'Crab Cakes', 'Lobster Roll', 'Clam Chowder', 'Steamed Mussels',
    'Fish Tacos', 'Seared Scallops', 'Oysters on the Half Shell', 'Shrimp Po’ Boy',
    'Blackened Catfish', 'Steamed Crab Legs', 'Calamari', 'Ceviche',
  ],
  pizza: [
    'Margherita Pizza', 'Pepperoni Pizza', 'Cheese Pizza', 'Supreme Pizza',
    'Meat Lover’s Pizza', 'Veggie Pizza', 'BBQ Chicken Pizza', 'Hawaiian Pizza',
    'White Pizza', 'Buffalo Chicken Pizza', 'Calzone', 'Garlic Knots',
    'Cheese Breadsticks', 'Stromboli', 'Caesar Salad', 'Cannoli',
  ],
  burgers: [
    'Classic Cheeseburger', 'Bacon Cheeseburger', 'Double Cheeseburger', 'Hamburger',
    'Mushroom Swiss Burger', 'BBQ Burger', 'Patty Melt', 'Veggie Burger',
    'Turkey Burger', 'Jalapeño Burger', 'French Fries', 'Sweet Potato Fries',
    'Onion Rings', 'Cheese Fries', 'Milkshake', 'Hot Dog',
  ],
  breakfast: [
    'Pancakes', 'Buttermilk Waffles', 'French Toast', 'Eggs Benedict',
    'Western Omelette', 'Bacon & Eggs', 'Breakfast Burrito', 'Avocado Toast',
    'Hash Browns', 'Biscuits & Gravy', 'Breakfast Sandwich', 'Chicken & Waffles',
    'Steak & Eggs', 'Cinnamon Roll', 'Yogurt Parfait', 'Huevos Rancheros',
  ],
  dessert: [
    'Chocolate Cake', 'Cheesecake', 'Apple Pie', 'Tiramisu',
    'Crème Brûlée', 'Brownie Sundae', 'Ice Cream Sundae', 'Banana Split',
    'Key Lime Pie', 'Carrot Cake', 'Bread Pudding', 'Molten Lava Cake',
    'Churros', 'Cannoli', 'Milkshake', 'Affogato',
  ],
  steakhouse: [
    'Ribeye', 'New York Strip', 'Filet Mignon', 'Sirloin Steak',
    'Porterhouse', 'Prime Rib', 'T-Bone Steak', 'Steak & Shrimp',
    'Grilled Chicken Breast', 'Baby Back Ribs', 'Grilled Salmon',
    'Loaded Baked Potato', 'Steak Fries', 'Mac & Cheese',
    'Caesar Salad', 'Wedge Salad', 'Onion Rings', 'Creamed Spinach',
  ],
}

/**
 * Cuisine hints found in restaurant names ("LongHorn Steakhouse", "Angelia's
 * Pizza", "Pho Saigon"). Used when neither the chain list nor the Google
 * cuisine type matched. Order matters — more specific terms first.
 */
const NAME_CUISINE_HINTS: [string, keyof typeof CUISINE_MENUS][] = [
  ['steakhouse', 'steakhouse'], ['steak', 'steakhouse'], ['chophouse', 'steakhouse'],
  ['pizzeria', 'pizza'], ['pizza', 'pizza'],
  ['taqueria', 'mexican'], ['cantina', 'mexican'], ['taco', 'mexican'],
  ['sushi', 'japanese'], ['ramen', 'japanese'], ['hibachi', 'japanese'], ['izakaya', 'japanese'],
  ['pho', 'vietnamese'], ['banhmi', 'vietnamese'],
  ['trattoria', 'italian'], ['ristorante', 'italian'], ['osteria', 'italian'], ['pasta', 'italian'],
  ['barbecue', 'bbq'], ['barbeque', 'bbq'], ['bbq', 'bbq'], ['smokehouse', 'bbq'],
  ['seafood', 'seafood'], ['oyster', 'seafood'], ['crab', 'seafood'], ['lobster', 'seafood'], ['fishhouse', 'seafood'],
  ['burger', 'burgers'],
  ['diner', 'breakfast'], ['pancake', 'breakfast'], ['waffle', 'breakfast'], ['brunch', 'breakfast'],
  ['thai', 'thai'], ['curry', 'indian'], ['tandoor', 'indian'],
  ['gyro', 'greek'], ['greek', 'greek'],
  ['noodle', 'chinese'], ['wok', 'chinese'], ['dumpling', 'chinese'],
  ['kbbq', 'korean'], ['korean', 'korean'],
  ['creamery', 'dessert'], ['icecream', 'dessert'], ['gelato', 'dessert'], ['bakery', 'dessert'],
  ['grill', 'american'], ['tavern', 'american'], ['pub', 'american'], ['roadhouse', 'american'],
]

/** Strip apostrophes, punctuation, and location suffixes, then lowercase. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, '')          // drop apostrophes: "mcdonald's" -> "mcdonalds"
    .replace(/#\s*\d+/g, ' ')       // drop store numbers like "#123"
    .replace(/\b\d+\b/g, ' ')       // drop standalone numbers
    .replace(/[^a-z0-9]+/g, ' ')    // non-alphanumerics -> space
    .replace(/\s+/g, ' ')
    .trim()
}

/** Same as normalize but with all spaces removed, for substring matching. */
function compact(value: string): string {
  return normalize(value).replace(/ /g, '')
}

/**
 * Resolve a place name to a known chain's canonical key, or null. Matching is
 * case-insensitive and tolerant of location suffixes (e.g. "Chipotle #483",
 * "McDonald's - Main St").
 */
function matchChain(placeName: string): string | null {
  const compactName = compact(placeName)
  if (!compactName) return null

  // Direct alias hit (nicknames, "and" vs "&", etc.).
  for (const alias in CHAIN_ALIASES) {
    if (compactName.includes(alias)) return CHAIN_ALIASES[alias]
  }

  // Canonical-name substring match.
  for (const key in CHAIN_MENUS) {
    if (compactName.includes(compact(key))) return key
  }

  return null
}

/** Official domains for the known chains — powers logo lookups by name. */
const CHAIN_DOMAINS: Record<string, string> = {
  "McDonald's": 'mcdonalds.com',
  'Burger King': 'bk.com',
  "Wendy's": 'wendys.com',
  'Chick-fil-A': 'chick-fil-a.com',
  'Taco Bell': 'tacobell.com',
  'Chipotle': 'chipotle.com',
  'Subway': 'subway.com',
  'Starbucks': 'starbucks.com',
  "Dunkin'": 'dunkindonuts.com',
  "Domino's": 'dominos.com',
  'Pizza Hut': 'pizzahut.com',
  'Panera Bread': 'panerabread.com',
  'Five Guys': 'fiveguys.com',
  'Shake Shack': 'shakeshack.com',
  'Popeyes': 'popeyes.com',
  'KFC': 'kfc.com',
  'Wingstop': 'wingstop.com',
  'Buffalo Wild Wings': 'buffalowildwings.com',
  'Olive Garden': 'olivegarden.com',
  "Applebee's": 'applebees.com',
  "Chili's": 'chilis.com',
  'IHOP': 'ihop.com',
  "Denny's": 'dennys.com',
  'Texas Roadhouse': 'texasroadhouse.com',
  'Outback Steakhouse': 'outback.com',
  'Cheesecake Factory': 'thecheesecakefactory.com',
  'Panda Express': 'pandaexpress.com',
}

/**
 * Resolve a place name to a known chain's official domain (e.g. "McDonald's
 * #4523" -> "mcdonalds.com") so chain logos can render before the place has
 * been added and enriched with its real website.
 */
export function chainDomain(placeName: string): string | null {
  const key = matchChain(placeName)
  return key ? CHAIN_DOMAINS[key] ?? null : null
}

/**
 * Generic dishes across the cuisine banks, deduped and sorted. Deliberately
 * excludes chain menus — branded items ("Chick-fil-A Chicken Sandwich")
 * should never be suggested at another restaurant.
 */
const ALL_DISHES: string[] = (() => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const list of Object.values(CUISINE_MENUS)) {
    for (const dish of list) {
      const key = dish.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        out.push(dish)
      }
    }
  }
  return out.sort((a, b) => a.localeCompare(b))
})()

/**
 * Search every dish bank for a typed query, prefix matches first. Used by the
 * meal form typeahead so typing always finds dishes even when the place
 * doesn't match a chain or cuisine bank.
 */
export function searchDishes(query: string, limit = 12): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const starts: string[] = []
  const contains: string[] = []
  for (const dish of ALL_DISHES) {
    const dl = dish.toLowerCase()
    if (dl.startsWith(q)) starts.push(dish)
    else if (dl.includes(q)) contains.push(dish)
  }
  return [...starts, ...contains].slice(0, limit)
}

/**
 * Return dish suggestions for a place. Prefers an exact-ish chain match on the
 * place name; otherwise falls back to a cuisine bank. Returns an empty array
 * when neither matches so the caller can hide the UI.
 */
export function getMenuSuggestions(placeName: string, cuisineType: string): string[] {
  const chainKey = placeName ? matchChain(placeName) : null
  if (chainKey) return CHAIN_MENUS[chainKey]

  if (cuisineType) {
    const cuisineKey = normalize(cuisineType).replace(/ /g, '')
    // Match a cuisine bank by checking each known key as a substring, so
    // "Italian Restaurant" or "italian_restaurant" both resolve to "italian".
    for (const key in CUISINE_MENUS) {
      if (cuisineKey.includes(key)) return CUISINE_MENUS[key]
    }
  }

  // Google often tags places with a generic type, but the NAME usually says
  // what kind of food it is ("LongHorn Steakhouse", "Angelia's Pizza").
  if (placeName) {
    const compactName = compact(placeName)
    for (const [hint, bank] of NAME_CUISINE_HINTS) {
      if (compactName.includes(hint)) return CUISINE_MENUS[bank]
    }
    for (const key in CUISINE_MENUS) {
      if (compactName.includes(key)) return CUISINE_MENUS[key]
    }
  }

  return []
}
