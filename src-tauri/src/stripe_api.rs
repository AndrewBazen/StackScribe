use std::sync::Arc;
use serde::{Deserialize, Serialize};
use axum::{extract::State, Json};
use stripe::{
    api_key,
    Client,
    CreatePaymentIntentParams,
    PaymentIntent,
    PaymentIntentStatus,
    PaymentMethod,
    PaymentMethodType,
};

#[derive(Clone)]
pub struct AppState {
    pub stripe: Client,
}

#[derive(Deserialize)]
pub struct CheckoutRequest {
    pub user_id: String,
}

#[derive(Serialize)]
pub struct CheckoutResponse {
    pub checkout_url: String,
}

pub async fn create_checkout_session(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CheckoutRequest>,
) -> Result<Json<CheckoutResponse>, String> {
    // Build Session
    let mut params = CreateCheckoutSession::new();
    params.mode = Some(CheckoutSessionMode::Subscription);
    params.success_url = Some("https://example.com/success".to_string());
    params.cancel_url = Some("https://example.com/cancel".to_string());
    

    // Example: add a subscription price
    let mut line_item = CreateCheckoutSessionLineItems::new();
    let mut price_data = CreateCheckoutSessionLineItemsPriceData::new();
    price_data.price = Some("price_1234567890abcdef".to_string());
    line_item.price_data = Some(price_data);
    line_item.quantity = Some(1);
    params.line_items = Some(vec![line_item]);
    
    let session = stripe::CheckoutSession::create(&state.stripe, params)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Json(CheckoutResponse {
        checkout_url: session.url.ok_or("No URL returned from Stripe")?,
    }))
}