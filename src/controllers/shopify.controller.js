import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js"
import { ShopifyDetails } from "../models/shopifyDetails.model.js";
import axios from "axios"

export const getTotalOrders = asyncHandler(async (req, res, next) => {
  try {
    // 1. Authentication check
    if (!req.user?._id) {
      return next(new ApiError(401, "Authentication required"));
    }

    // 2. Get Shopify credentials
    const shopify = await ShopifyDetails.findOne({ userId: req.user._id });
    if (!shopify) {
      return next(new ApiError(404, "Shopify credentials not found"));
    }

    // 3. Prepare API requests
    const countUrl = `https://${shopify.shopifyShopName}.myshopify.com/admin/api/${shopify.apiVersion}/orders/count.json`;
    const ordersUrl = `https://${shopify.shopifyShopName}.myshopify.com/admin/api/${shopify.apiVersion}/orders.json?limit=5&status=any`;
    
    console.log(`Making requests to: ${countUrl} and ${ordersUrl}`);

    // 4. Make parallel API calls
    const [countResponse, ordersResponse] = await Promise.all([
      axios.get(countUrl, {
        headers: {
          "X-Shopify-Access-Token": shopify.accessToken,
          "Content-Type": "application/json",
        },
        timeout: 10000
      }),
      axios.get(ordersUrl, {
        headers: {
          "X-Shopify-Access-Token": shopify.accessToken,
          "Content-Type": "application/json",
        },
        timeout: 10000
      })
    ]);

    // 5. Validate responses
    if (!countResponse.data || typeof countResponse.data.count !== 'number') {
      console.error('Invalid count response:', countResponse.data);
      return next(new ApiError(502, "Invalid count response format"));
    }

    if (!ordersResponse.data || !Array.isArray(ordersResponse.data.orders)) {
      console.error('Invalid orders response:', ordersResponse.data);
      return next(new ApiError(502, "Invalid orders data format"));
    }

    // 6. Process sample orders data
    const sampleOrders = ordersResponse.data.orders.slice(0, 5).map(order => ({
      id: order.id,
      order_number: order.order_number,
      created_at: order.created_at,
      customer_name: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Guest',
      financial_status: order.financial_status,
      total_price: order.total_price,
      currency: order.currency
    }));

    // 7. Return successful response with both count and sample data
    return res.status(200).json(
      new ApiResponse(200, { 
        totalOrders: countResponse.data.count,
        sampleOrders, // Includes 5 most recent orders as examples
        shopName: shopify.shopifyShopName 
      }, "Order data retrieved successfully")
    );

  } catch (error) {
    console.error('Shopify API Error:', error);
    
    // Handle specific error cases
    if (error.response) {
      console.error('Shopify API Response Error:', {
        status: error.response.status,
        data: error.response.data
      });

      if (error.response.status === 401) {
        return next(new ApiError(401, "Invalid Shopify access token"));
      }
      if (error.response.status === 404) {
        return next(new ApiError(404, "Shopify store not found"));
      }
      return next(new ApiError(error.response.status, 
        error.response.data?.errors || "Shopify API request failed"));
    } 
    else if (error.request) {
      console.error('No response received:', error.request);
      return next(new ApiError(504, "Shopify API request timed out"));
    }
    else {
      console.error('Configuration Error:', error.message);
      return next(new ApiError(500, "Failed to configure Shopify API request"));
    }
  }
});
export const getAllProducts = asyncHandler(async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return next(new ApiError(401, "Authentication required"));
    }

    const shopify = await ShopifyDetails.findOne({ userId: req.user._id });
    if (!shopify) {
      return next(new ApiError(404, "Shopify credentials not found"));
    }

    const url = `https://${shopify.shopifyShopName}.myshopify.com/admin/api/${shopify.apiVersion}/products.json`;

    const { data } = await axios.get(url, {
      headers: {
        "X-Shopify-Access-Token": shopify.accessToken,
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });

    if (!data.products) {
      return next(new ApiError(500, "Invalid response from Shopify API"));
    }

    const allProducts = data.products.map((product) => ({
      id: product.id,
      title: product.title,
      description: product.body_html || "No description available",
      product_type: product.product_type || "Uncategorized",
      vendor: product.vendor || "Unknown",
      created_at: product.created_at,
      updated_at: product.updated_at,
      tags: product.tags ? product.tags.split(",") : [],
      status: product.status || "active",
      variants: product.variants.map((variant) => ({
        id: variant.id,
        title: variant.title,
        price: variant.price,
        sku: variant.sku,
        inventory_quantity: variant.inventory_quantity || 0,
        requires_shipping: variant.requires_shipping,
        weight: variant.weight,
        weight_unit: variant.weight_unit,
      })),
      images: product.images.map((image) => image.src),
      options: product.options.map((option) => ({
        name: option.name,
        values: option.values,
      })),
    }));

    return res.status(200).json(
      new ApiResponse(200, { products: allProducts }, "Products retrieved successfully")
    );
  } catch (error) {
    if (error.response?.status === 401) {
      return next(new ApiError(401, "Invalid Shopify access token"));
    }
    if (error.response?.status === 404) {
      return next(new ApiError(404, "Shopify store not found"));
    }
    return next(new ApiError(500, "Failed to fetch products from Shopify"));
  }
});

export const getAllProductsByCategory = asyncHandler(async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return next(new ApiError(401, "Authentication required"));
    }

    const shopify = await ShopifyDetails.findOne({ userId: req.user._id });
    if (!shopify) {
      return next(new ApiError(404, "Shopify credentials not found"));
    }

    const url = `https://${shopify.shopifyShopName}.myshopify.com/admin/api/${shopify.apiVersion}/products.json`;

    const { data } = await axios.get(url, {
      headers: {
        "X-Shopify-Access-Token": shopify.accessToken,
        "Content-Type": "application/json",
      },
      timeout: 5000
    });

    const collections = {};

    data.products.forEach((product) => {
      const productType = product.product_type || "Uncategorized";
      
      if (!collections[productType]) {
        collections[productType] = [];
      }

      const variantsDetails = product.variants.map((variant) => ({
        id: variant.id,
        name: product.title,
        price: variant.price,
        inventory_quantity: variant.inventory_quantity || 0,
        created_at: variant.created_at,
        updated_at: variant.updated_at,
        requires_shipping: variant.requires_shipping,
        weight: variant.weight,
        weight_unit: variant.weight_unit,
      }));

      collections[productType].push(...variantsDetails);
    });

    return res.status(200).json(
      new ApiResponse(200, { collections }, "Products categorized successfully")
    );
  } catch (error) {
    if (error.response?.status === 401) {
      return next(new ApiError(401, "Invalid Shopify access token"));
    }
    if (error.response?.status === 404) {
      return next(new ApiError(404, "Shopify store not found"));
    }
    return next(new ApiError(500, "Failed to fetch products from Shopify"));
  }
});

export const setShopifyCred = asyncHandler(async (req, res, next) => {
  try {
    const { accessToken, shopifyShopName, apiVersion } = req.body;

    if (!accessToken || !shopifyShopName || !apiVersion) {
      return next(new ApiError(400, "All credentials are required"));
    }

    if (!req.user?._id) {
      return next(new ApiError(401, "Authentication required"));
    }

    let shopify = await ShopifyDetails.findOne({ userId: req.user._id });

    if (shopify) {
      shopify = await ShopifyDetails.findOneAndUpdate(
        { userId: req.user._id },
        {
          accessToken,
          shopifyShopName,
          apiVersion
        },
        {
          new: true,
          runValidators: true
        }
      );

      return res.status(200).json(
        new ApiResponse(200, { shopify }, "Shopify credentials updated successfully")
      );
    }

    const newShopify = await ShopifyDetails.create({
      accessToken,
      shopifyShopName,
      apiVersion,
      userId: req.user._id
    });

    return res.status(201).json(
      new ApiResponse(201, { shopify: newShopify }, "Shopify credentials created successfully")
    );
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(409, "Duplicate Shopify credentials"));
    }
    return next(new ApiError(500, "Failed to save Shopify credentials"));
  }
});

export const updateShopifyCred = asyncHandler(async (req, res, next) => {
  try {
    const { accessToken, shopifyShopName, apiVersion } = req.body;

    if (!req.user?._id) {
      return next(new ApiError(401, "Authentication required"));
    }

    const shopify = await ShopifyDetails.findOne({ userId: req.user._id });
    if (!shopify) {
      return next(new ApiError(400, "Shopify credentials not found"));
    }

    const updatedShopify = await ShopifyDetails.findByIdAndUpdate(
      shopify._id,
      {
        accessToken: accessToken || shopify.accessToken,
        shopifyShopName: shopifyShopName || shopify.shopifyShopName,
        apiVersion: apiVersion || shopify.apiVersion
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!updatedShopify) {
      return next(new ApiError(400, "Shopify Details not updated"));
    }

    return res.status(200).json(
      new ApiResponse(200, { shopify: updatedShopify }, "Shopify Details updated successfully")
    );
  } catch (error) {
    return next(new ApiError(500, "Failed to update Shopify credentials"));
  }
});