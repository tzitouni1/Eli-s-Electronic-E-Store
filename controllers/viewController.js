const pool = require(`${__dirname}/../db`);
const queries = require(`${__dirname}/../queries`);

// This file is used to render the PUG pages as well as handle some SQL queries and functions involved

// Function to get all products for the main page and render pug template
exports.getOverview = (req, res) => {
  pool.query(queries.getAllListings, (error, results) => {
    if (error) {
      console.error(error);
      return res.render('overview', { listings: [] }); // Pass an empty array if there's an error
    }
    console.log(results.rows); // This line is for debugging
    res.render('overview', { listings: results.rows || [] });
  });
};

//Same as getOverview but for employees
exports.getEmployeeOverview = (req, res) => {
  pool.query(queries.getAllListings, (error, results) => {
    if (error) {
      console.error(error);
      return res.render('employeeOverview', { listings: [] }); // Pass an empty array if there's an error
    }
    console.log(results.rows); // This line is for debugging
    res.render('employeeOverview', { listings: results.rows || [] });
  });
};

// Render the product page
exports.getProduct = (req, res) => {
  res.status(200).render('product', {
    header: '| Product Name',
  });
};

// Render employee login page
exports.getEmployeeLogin = (req, res) => {
  res.status(200).render('employeeLogin', {
    title: 'Log into your account',
  });
};

// Render login page for customers
exports.getLogin = (req, res) => {
  res.status(200).render('login', {
    title: 'Log into your account',
  });
};

// Render sign up page for customers
exports.getSignUp = (req, res) => {
  res.status(200).render('signup', {
    title: 'Create your account',
  });
};

// Render cart page for customers
exports.getCart = (req, res) => {
  res.status(200).render('cart', {
    title: 'Cart Items',
  });
};

// Render checkout page for customers
exports.getCheckout = (req, res) => {
  res.status(200).render('checkout', {
    title: 'Checkout',
  });
};

// Render account page for customers
exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Account',
  });
};

// Handles the search bar for the main page
exports.searchListings = (req, res) => {
  const searchQuery = req.query.query;
  const filter = req.query.filter;
  const minPrice = req.query.minPrice || 0;
  const maxPrice = req.query.maxPrice || 10000;

  let query = '';
  // uses empty query and appends to the query depending on what constraints the user selects in search bar
  switch (filter) {
    case 'phones':
      query = queries.searchPhonesListings;
      break;
    case 'computers':
      query = queries.searchComputersListings;
      break;
    case 'cameras':
      query = queries.searchCamerasListings;
      break;
    default:
      query = queries.searchAllListings;
  }

  // If there is an error, return the overview page, if not return listings from query
  pool.query(
    query,
    [`%${searchQuery}%`, minPrice, maxPrice],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.render('overview', {
          listings: [],
          searchParams: req.query,
        });
      }
      res.render('overview', {
        listings: results.rows || [],
        searchParams: req.query,
      });
    }
  );
};

// Same search feature as the one for customers but will return query results to the 'Employee overview' instead of the customer overview
exports.searchEmployeeListings = (req, res) => {
  const searchQuery = req.query.query;
  const filter = req.query.filter;
  const minPrice = req.query.minPrice || 0;
  const maxPrice = req.query.maxPrice || 10000;

  let query = '';

  switch (filter) {
    case 'phones':
      query = queries.searchPhonesListings;
      break;
    case 'computers':
      query = queries.searchComputersListings;
      break;
    case 'cameras':
      query = queries.searchCamerasListings;
      break;
    default:
      query = queries.searchAllListings;
  }

  pool.query(
    query,
    [`%${searchQuery}%`, minPrice, maxPrice],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.render('employeeOverview', {
          listings: [],
          searchParams: req.query,
        });
      }
      res.render('employeeOverview', {
        listings: results.rows || [],
        searchParams: req.query,
      });
    }
  );
};

//  Funcion to render product page and return details specific to that product
exports.getProductDetails = (req, res) => {
  const productId = req.params.id;

  // error handling if there is no product found
  pool.query(queries.getProductById, [productId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(404).send('Product not found');
    }
    // render product page if found
    if (results.rows.length > 0) {
      res.render('product', { product: results.rows[0] });
    } else {
      res.status(404).send('Product not found2');
    }
  });
};

// This function is used to render the cart page
exports.getActiveOrder = async (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login'); // Redirect to login if not logged in
  }

  try {
    // Fetch the active order for the logged-in user
    const activeOrderQuery =
      "SELECT * FROM ordert WHERE customerid = $1 AND status = 'active'";
    const activeOrderResult = await pool.query(activeOrderQuery, [
      req.session.userId,
    ]);

    if (activeOrderResult.rows.length > 0) {
      const orderId = activeOrderResult.rows[0].orderid;
      console.log(orderId);
      // Fetch the items in the order
      const orderItemsQuery =
        'SELECT * FROM contains JOIN product ON contains.productid = product.productid WHERE orderid = $1';
      const orderItemsResult = await pool.query(orderItemsQuery, [orderId]);

      // Render the cart page with order details
      res.render('cart', {
        orderItems: orderItemsResult.rows,
        order: activeOrderResult.rows[0],
      });
    } else {
      // Render the cart page with a message if there's no active order
      res.render('cart', { orderItems: [], message: 'No active order found' });
    }
  } catch (error) {
    console.error('Error fetching active order:', error);
    res.status(500).send('Server error');
  }
};
