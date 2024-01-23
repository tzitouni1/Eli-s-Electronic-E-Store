const path = require('path');
const express = require('express');
const morgan = require('morgan');
const viewRouter = require('./routes/viewRoutes');
const session = require('express-session');
const bcrypt = require('bcrypt');
const pool = require('./db');
const app = express();
const queries = require(`./queries`);

// This file is used to give access to files among the node app and handle middleware functions

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//Middleware
// Middleware to parse body of the request
app.use(express.urlencoded({ extended: true }));

// Creates session id to check if users are logged in or not
app.use(
  session({
    secret: 'secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// When logging in this function will be used to create a session if the user exists
app.use(async (req, res, next) => {
  // Creates session ID for customers
  if (req.session && req.session.userId) {
    try {
      const userResult = await pool.query(queries.findUserByProductID, [
        req.session.userId,
      ]);

      if (userResult.rows.length > 0) {
        // User is found, makes user data available to all templates
        res.locals.user = userResult.rows[0];
        console.log('user found');
      } else {
        // User ID not found in database, clear the session
        req.session.destroy();
        console.log('user not found');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  }
  // Creates session ID for employees
  if (req.session && req.session.employeeId) {
    try {
      const employeeResult = await pool.query(queries.findEmployeeQuery, [
        req.session.employeeId,
      ]);

      if (employeeResult.rows.length > 0) {
        // Employee is found, make employee data available to all templates
        res.locals.employee = employeeResult.rows[0];
      } else {
        // Employee ID not found in database, clear the session
        req.session.destroy();
      }
    } catch (error) {
      console.error('Error fetching employee:', error);
    }
  }
  next();
});

// This middleware was used in the tutorial I watched when setting up the backend to run in development vs in production
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(`${__dirname}/public`));

// Shows up in console when running the website that the middleware is working
app.use((req, res, next) => {
  console.log('Middleware: ');
  next();
});
// Gets current time
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Express post/get/use requests used in the frontend
app.use('/', viewRouter);
app.post('/signup', async (req, res) => {
  try {
    length = 9;
    customerid = Math.floor(
      Math.pow(10, length - 1) +
        Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1)
    );
    // Getting user details from the request
    const { firstname, lastname, email, password, address, phone } = req.body;

    // Hashing the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Executing query to insert a new user into the database
    await pool.query(queries.insertUserQuery, [
      customerid,
      firstname,
      lastname,
      email,
      hashedPassword,
      address,
      phone,
    ]);

    // Redirecting to the home page after successful registration
    res.redirect('/');
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).send('Server error during registration');
  }
});

// When logging in it will compare inputted data to the database
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Query to find the user by email
    const userResult = await pool.query(queries.findUserByEmail, [email]);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      // Compares input to hashed password in DB
      if (await bcrypt.compare(password, user.password)) {
        // set user session
        req.session.userId = user.customerid;
        res.redirect('/'); // Redirect to the home page after successful login
        console.log(req.session.userId); // Used for debugging
      } else {
        // Passwords do not match
        res.redirect('/login'); // Redirect back to the login page if login fails
      }
    } else {
      // User not found
      res.redirect('/login'); // Redirect back to the login page if login fails
    }
  } catch (error) {
    console.error('Login error:', error); // Used for debugging
    res.status(500).send('Server error during login');
  }
});

// Same as customer login but for employees
app.post('/employeeLogin', async (req, res) => {
  try {
    const { employeeid, password } = req.body;

    // Query to find the employee by ID
    const employeeResult = await pool.query(queries.findEmployeeQuery, [
      employeeid,
    ]);

    if (employeeResult.rows.length > 0) {
      const employee = employeeResult.rows[0];

      if (await bcrypt.compare(password, employee.password)) {
        // Set employee session
        req.session.employeeId = employee.employeeid;
        res.redirect('/employee-dashboard'); // Redirect to an employee-specific page after successful login
      } else {
        // Passwords do not match
        res.redirect('/employeeLogin'); // Redirect back with an error message
      }
    } else {
      // Employee not found
      res.redirect('/employeeLogin');
    }
  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).send('Server error during employee login');
  }
});

// Both customers/employees sessions will be destroyed when logging out so the site knows what access to give to user
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Function that will post the newly added cart item to the database
app.post('/add-to-order', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send('User not logged in');
  }
  // gets product id and quantity
  const productid = req.body.productid;
  const quantityToAdd = req.body.quantity || 1;

  try {
    // Check if there's an active order for this user
    const activeOrderResult = await pool.query(queries.activeOrderID, [
      req.session.userId,
    ]);

    let orderId;

    if (activeOrderResult.rows.length === 0) {
      // Create a new order
      const newOrderResult = await pool.query(queries.createOrderQuery, [
        req.session.userId,
      ]);
      orderId = newOrderResult.rows[0].orderid;
    } else {
      // Use the existing active order
      orderId = activeOrderResult.rows[0].orderid;
    }

    // Check if the item already exists in the order
    const itemExistsResult = await pool.query(queries.itemExistsQuery, [
      productid,
      orderId,
    ]);

    if (itemExistsResult.rows.length > 0) {
      // Item exists, update the quantity
      const currentQuantity = itemExistsResult.rows[0].quantity;
      const newQuantity = currentQuantity + quantityToAdd;
      await pool.query(queries.updateItemQuery, [
        newQuantity,
        productid,
        orderId,
      ]);
    } else {
      // Item does not exist, add it to the order
      await pool.query(queries.addItemQuery, [
        productid,
        orderId,
        quantityToAdd,
      ]);
    }
    // Alerts that will be seen by the customer
    res.send('Item added/updated in order');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding/updating item in order');
  }
});

// Function to retrieve cart information from the DB
app.get('/mycart', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login'); // Redirect to login if user is not logged in
  }

  try {
    // Fetch the active order for the user
    const orderResult = await pool.query(queries.activeOrderQuery, [
      req.session.userId,
    ]);

    if (orderResult.rows.length > 0) {
      const orderId = orderResult.rows[0].orderid;

      // Fetch items in the order
      const itemsResult = await pool.query(queries.itemsQuery, [orderId]);

      // Render the cart page with the order items
      res.render('cart', {
        items: itemsResult.rows,
        order: orderResult.rows[0],
      });
    } else {
      // Render the cart page with no items if there is no active order
      res.render('cart', { items: [], order: null });
    }
  } catch (error) {
    console.error('Error fetching cart:', error); // used for debugging
    res.status(500).send('Error fetching cart');
  }
});

// Function used for deleting items from cart and contains relation in DB
app.post('/delete-item', async (req, res) => {
  const { productid, orderid } = req.body;
  try {
    // Fetch current quantity
    const result = await pool.query(queries.quantityQuery, [
      productid,
      orderid,
    ]);
    // Calculate the new quantity of the item in the cart
    if (result.rows.length > 0) {
      let newQuantity = result.rows[0].quantity - 1;
      // If the quantity of the item is still greater than 0, update the information in the DB
      if (newQuantity > 0) {
        // Update the quantity
        await pool.query(queries.updateQuantityQuery, [
          newQuantity,
          productid,
          orderid,
        ]);
      } // If the item needs to be removed from the DB
      else {
        // Delete the item
        await pool.query(queries.deleteQuery, [productid, orderid]);
      }
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Item not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function for rendering checkout page and getting user info to fill into the order (name, addr)
app.get('/checkout', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  try {
    const userResult = await pool.query(queries.userQuery, [
      req.session.userId,
    ]);

    if (userResult.rows.length > 0) {
      res.render('checkout', { user: userResult.rows[0] });
    } else {
      // Handle case where user is not found
      res.redirect('/login');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// Function to post checkout info into the DB
app.post('/process-checkout', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send('User not logged in');
  }
  // Get inputted information from the PUG template
  const { shippingAddress, paymentType } = req.body;

  try {
    await pool.query('BEGIN');
    // Update the order status to 'processing' and set the shipping address
    const updatedOrder = await pool.query(queries.updateOrderQuery, [
      shippingAddress,
      req.session.userId,
    ]);
    const orderId = updatedOrder.rows[0].orderid;

    // Fetch the items and their prices in the order
    const orderItems = await pool.query(queries.orderItemsQuery, [orderId]);

    // Calculate total amount
    let totalAmount = 0;
    orderItems.rows.forEach((item) => {
      totalAmount += item.price * item.quantity;
    });

    // Create a payment record
    await pool.query(queries.createPaymentQuery, [
      paymentType,
      'Pending',
      totalAmount,
      orderId,
      new Date(),
    ]);

    // Fetch the items in the order
    const ItemsResult = await pool.query(queries.fetchItemInfo, [orderId]);

    // Update the stock for each item
    for (const item of ItemsResult.rows) {
      await pool.query(queries.updateStockQuery, [
        item.quantity,
        item.productid,
      ]);
    }

    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Checkout error:', error);
    res.json({ success: false, message: 'Error processing checkout' });
  }
});

// Retrieve account and order information from the DB
app.get('/account', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  const sort = req.query.sort || 'date'; // Default sorting by date

  try {
    // Fetch user account details
    const user = await pool.query(queries.userAccountQuery, [
      req.session.userId,
    ]);

    // Dynamic query for fetching and sorting orders
    let ordersQuery =
      'SELECT ordert.orderid, payment.amount, payment.date, ordert.status FROM ordert JOIN payment ON ordert.orderid = payment.orderid WHERE ordert.customerid = $1';
    if (sort === 'date') {
      ordersQuery += ' ORDER BY payment.date DESC';
    } else if (sort === 'status') {
      ordersQuery += ' ORDER BY ordert.status';
    } else if (sort === 'total') {
      ordersQuery += ' ORDER BY payment.amount DESC';
    }

    const orders = await pool.query(ordersQuery, [req.session.userId]);
    console.log('Orders:', orders.rows); // Used for debugging
    res.render('account', {
      user: user.rows[0],
      orders: orders.rows || [],
      sort,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// If changes are made to the account this function will post them to the DB
app.post('/update-account', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send('User not logged in');
  }

  try {
    const { firstname, lastname, email, address, phone } = req.body;

    // Fetch the current user's data
    const userQuery = 'SELECT * FROM customer WHERE customerid = $1';
    const user = await pool.query(userQuery, [req.session.userId]);

    if (user.rows.length === 0) {
      return res.status(404).send('User not found');
    }

    // Check if the current password is correct
    // const isMatch = await bcrypt.compare(password, user.rows[0].password);
    // if (!isMatch) {
    //   return res.status(400).send('Incorrect password');
    // }

    // // Hash the new password
    // if (newPassword != '') {
    //   const hashedPassword = await bcrypt.hash(newPassword, 10);
    // } else {
    //   const hashedPassword = user.rows[0].password;
    // }

    // Update user information in the database
    await pool.query(queries.updateUserInfoQuery, [
      firstname,
      lastname,
      email,
      address,
      phone,
      req.session.userId,
    ]);

    res.redirect('/account'); // Redirect back to the account page
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).send('Error updating account information');
  }
});

// Function to retrieve product information from the DB
app.get('/product/:id', async (req, res) => {
  try {
    const productId = req.params.id;

    // Fetch basic product details
    const productQuery = 'SELECT * FROM product WHERE productid = $1';
    const productResult = await pool.query(productQuery, [productId]);
    const product = productResult.rows[0];

    if (!product) {
      return res.status(404).send('Product not found');
    }

    let categoryDetails;

    // Fetch additional details based on category
    switch (product.category) {
      case 'Laptops':
        const laptopQuery = 'SELECT * FROM laptop WHERE productid = $1';
        categoryDetails = await pool.query(laptopQuery, [productId]);
        break;
      case 'Cameras':
        const cameraQuery = 'SELECT * FROM camera WHERE productid = $1';
        categoryDetails = await pool.query(cameraQuery, [productId]);
        break;
      case 'Cellphones':
        const cellphoneQuery = 'SELECT * FROM cellphone WHERE productid = $1';
        categoryDetails = await pool.query(cellphoneQuery, [productId]);
        break;
    }

    res.render('product', {
      product,
      categoryDetails: categoryDetails ? categoryDetails.rows[0] : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// Function to render the employee dashboard page
app.get('/employee-dashboard', (req, res) => {
  // Ensure the user is an authenticated employee
  if (!req.session.employeeId) {
    return res.redirect('/employeeLogin');
  }
  res.render('employeeDashboard');
});

// Function to retrieve order informatin from the DB
app.get('/update-orders', (req, res) => {
  // Ensure the user is an authenticated employee
  if (!req.session.employeeId) {
    return res.redirect('/employeeLogin');
  }
  // Render the page or handle the logic for updating orders and payments
  res.send('Update Orders/Payments Page');
});

// Function to get product information from DB
app.get('/update-product/:id', async (req, res) => {
  // Checks session id to restrict access to employees only
  if (!req.session.employeeId) {
    return res.redirect('/employeeLogin');
  }

  try {
    const productId = req.params.id;
    const productQuery = 'SELECT * FROM product_details WHERE productid = $1'; //This is using a view product_details
    const productResult = await pool.query(productQuery, [productId]);

    if (productResult.rows.length > 0) {
      res.render('updateProduct', { product: productResult.rows[0] });
    } else {
      res.status(404).send('Product not found');
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
});

// Function to update the DB with product changes
app.post('/apply-product-update/:id', async (req, res) => {
  // Checks session id to restrict access to employees only
  if (!req.session.employeeId) {
    return res.redirect('/employeeLogin');
  }
  // information to be changed by employee
  const productId = req.params.id;
  const {
    name,
    description,
    price,
    stock,
    itemimage,
    category,
    processor,
    ram,
    storage,
    screenspecs,
    resolution,
    lenstype,
    cameratype,
    cameraresolution,
    dimensions,
  } = req.body;

  try {
    // Update general product information
    const updateProductQuery =
      'UPDATE product SET name = $1, description = $2, price = $3, stock = $4, itemimage = $5, category = $6 WHERE productid = $7';
    await pool.query(updateProductQuery, [
      name,
      description,
      price,
      stock,
      itemimage,
      category,
      productId,
    ]);

    // Update category-specific information based on category
    // Laptops:
    const updateLaptopQuery =
      'UPDATE laptop SET processor = $1, ram = $2, storage = $3, screenspecs = $4 WHERE productid = $5';
    await pool.query(updateLaptopQuery, [
      processor,
      ram,
      storage,
      screenspecs,
      productId,
    ]);
    // Cameras:
    const updateCameraQuery =
      'UPDATE camera SET resolution = $1, lenstype = $2, cameratype = $3 WHERE productid = $4';
    await pool.query(updateCameraQuery, [
      resolution,
      lenstype,
      cameratype,
      productId,
    ]);
    // Cellphones:
    const updateCellphoneQuery =
      'UPDATE cellphone SET cameraresolution = $1, storage = $2, dimensions = $3 WHERE productid = $4';
    await pool.query(updateCellphoneQuery, [
      cameraresolution,
      storage,
      dimensions,
      productId,
    ]);
    // After changes are made redirect to employee dash
    res.redirect('/employee-dashboard');
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
});

// Function to get order information from DB
app.get('/updateOrder', async (req, res) => {
  // Checks session id to restrict access to employees only
  if (!req.session.employeeId) {
    return res.redirect('/employeeLogin');
  }
  try {
    const ordersQuery = 'SELECT * FROM order_payment_view';
    const orders = await pool.query(ordersQuery);
    res.render('updateOrder', { orders: orders.rows });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
});

// Function for searching orders as you type
app.get('/search-orders', async (req, res) => {
  // Checks session id to restrict access to employees only
  if (!req.session.employeeId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const query = req.query.query;

  try {
    const searchQuery =
      'SELECT * FROM order_payment_view WHERE CAST(orderid AS TEXT) LIKE $1';
    const results = await pool.query(searchQuery, ['%' + query + '%']);
    res.json(results.rows);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error during search' });
  }
});

// function that will update DB with order changes made by the employee
app.post('/apply-order-updates', async (req, res) => {
  // Checks session id to restrict access to employees only
  if (!req.session.employeeId) {
    return res.redirect('/employeeLogin');
  }

  try {
    await pool.query('BEGIN'); // Start transaction

    // Loop through the form fields
    for (const [key, value] of Object.entries(req.body)) {
      if (key.startsWith('orderStatus-')) {
        const orderId = key.split('-')[1]; // Extract the order ID
        const updateOrderStatusQuery =
          'UPDATE ordert SET status = $1 WHERE orderid = $2';
        await pool.query(updateOrderStatusQuery, [value, orderId]);
      } else if (key.startsWith('paymentStatus-')) {
        const paymentId = key.split('-')[1]; // Extract the payment ID
        const updatePaymentStatusQuery =
          'UPDATE payment SET paymentstatus = $1 WHERE paymentid = $2';
        await pool.query(updatePaymentStatusQuery, [value, paymentId]);
      }
    }

    await pool.query('COMMIT'); // Commit the transaction
    res.redirect('/updateOrder'); // Redirect back to the order update page
  } catch (error) {
    await pool.query('ROLLBACK'); // Rollback the transaction in case of error
    console.error('Error applying order updates:', error);
    res.status(500).send('Error processing order updates');
  }
});

module.exports = app;
