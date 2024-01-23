// used in search to return all listings
exports.getAllListings = 'SELECT * FROM Product';
// selects specific listings
exports.getListing = 'SELECT * FROM Product WHERE productid = $1';
//Search specific listings
exports.searchAllListings =
  'SELECT * FROM product WHERE name ILIKE $1 AND price BETWEEN $2 AND $3';
exports.searchPhonesListings =
  "SELECT * FROM Product WHERE category = 'Cellphones' AND name ILIKE $1 AND price BETWEEN $2 AND $3";
exports.searchComputersListings =
  "SELECT * FROM Product WHERE category = 'Laptops' AND name ILIKE $1 AND price BETWEEN $2 AND $3";
exports.searchCamerasListings =
  "SELECT * FROM Product WHERE category = 'Cameras' AND name ILIKE $1 AND price BETWEEN $2 AND $3";
// find products by id
exports.getProductById = 'SELECT * FROM Product WHERE productid = $1';
// find users by id
exports.findUserByProductID = 'SELECT * FROM Customer WHERE customerid = $1';
// find users by email
exports.findUserByEmail = 'SELECT * FROM customer WHERE email = $1';
// find employees by id
exports.findEmployeeQuery = 'SELECT * FROM Employee WHERE employeeid = $1';
// Query to insert a new user into the database
exports.insertUserQuery =
  'INSERT INTO customer (customerid, firstname, lastname, email, password, address, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)';
// Selects item if active
exports.activeOrderID =
  "SELECT orderid FROM ordert WHERE customerid = $1 AND status = 'active'";
// Create a new order
exports.createOrderQuery =
  "INSERT INTO ordert (customerid, status) VALUES ($1, 'active') RETURNING orderid";
// Check if the item already exists in the order
exports.itemExistsQuery =
  'SELECT * FROM contains WHERE productid = $1 AND orderid = $2';
//Updates item quantity
exports.updateItemQuery =
  'UPDATE contains SET quantity = $1 WHERE productid = $2 AND orderid = $3';
// If the item does not exist, add it to the order
exports.addItemQuery =
  'INSERT INTO contains (productid, orderid, quantity) VALUES ($1, $2, $3)';
// Fetch the active order for the user
exports.activeOrderQuery =
  "SELECT * FROM ordert WHERE customerid = $1 AND status = 'active'";
// Fetch items in the order
exports.itemsQuery =
  'SELECT * FROM contains JOIN product ON contains.productid = products.productid WHERE orderid = $1';
// Fetch current quantity
exports.quantityQuery =
  'SELECT quantity FROM contains WHERE productid = $1 AND orderid = $2';
// Update the quantity
exports.updateQuantityQuery =
  'UPDATE contains SET quantity = $1 WHERE productid = $2 AND orderid = $3';
// Delete the item from the order
exports.deleteQuery =
  'DELETE FROM contains WHERE productid = $1 AND orderid = $2';
// get user information for checkout
exports.userQuery = 'SELECT * FROM customers WHERE customerid = $1';
// Update the order status to 'processing' and set the shipping address
exports.updateOrderQuery =
  "UPDATE ordert SET status = 'Processing', shippingaddress = $1 WHERE customerid = $2 AND status = 'active' RETURNING orderid";
// Fetch the items and their prices in the order
exports.orderItemsQuery =
  'SELECT product.price, contains.quantity FROM contains JOIN product ON contains.productid = product.productid WHERE contains.orderid = $1';
// Create a payment record
exports.createPaymentQuery =
  'INSERT INTO payment (paymenttype, paymentstatus, amount, orderid, date) VALUES ($1, $2, $3, $4, $5)';
// Fetch the items in the order
exports.fetchItemInfo =
  'SELECT productid, quantity FROM contains WHERE orderid = $1';
// Update the stock for each item
exports.updateStockQuery =
  'UPDATE product SET stock = stock - $1 WHERE productid = $2';
// Fetch user account details
exports.userAccountQuery =
  'SELECT firstname, lastname, email, address, phone FROM customer WHERE customerid = $1';
// Update user information in the database
exports.updateUserInfoQuery =
  'UPDATE customer SET firstname = $1, lastname = $2, email = $3, address = $4, phone = $5 WHERE customerid = $6';
