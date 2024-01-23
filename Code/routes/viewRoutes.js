const express = require('express');
const viewsController = require('../controllers/viewController');
const router = express.Router();

router.get('/', viewsController.getOverview);
router.get('/employeeOverview', viewsController.getEmployeeOverview);
router.get('/search', viewsController.searchListings);
router.get('/employeeSearch', viewsController.searchEmployeeListings);
// router.get('/product/:id', viewsController.getProductDetails);
router.get('/login', viewsController.getLogin);
router.get('/signup', viewsController.getSignUp);
router.get('/mycart', viewsController.getActiveOrder);
router.get('/checkout', viewsController.getCheckout);
router.get('/employeeLogin', viewsController.getEmployeeLogin);
// router.get('/account', viewsController.getAccount);

module.exports = router;
