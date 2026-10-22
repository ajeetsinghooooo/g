import { Order, RestaurantSettings } from '../types';

export function generateWhatsAppOrderMessage(order: Order, settings: RestaurantSettings): string {
  const divider = '━━━━━━━━━━━━━━━━━━━━━━━';
  
  let itemsList = '';
  order.items.forEach((item, index) => {
    itemsList += `${index + 1}. *${item.name}* x ${item.quantity}\n`;
    if (item.selectedAddons && item.selectedAddons.length > 0) {
      const addons = item.selectedAddons.map((a) => `${a.name} (+₹${a.price})`).join(', ');
      itemsList += `   _Add-ons: ${addons}_\n`;
    }
    itemsList += `   Price: ₹${item.price} each | Total: ₹${item.itemTotal}\n`;
  });

  const customerName = order.customer?.fullName || order.customerName || 'Customer';
  const customerPhone = order.customer?.phone || order.customerPhone || 'N/A';
  const deliveryAddress = order.customer?.deliveryAddress || (order.deliveryAddress ? `${order.deliveryAddress.house}, ${order.deliveryAddress.street}, ${order.deliveryAddress.area}` : 'Not provided');
  const landmark = order.customer?.landmark || order.deliveryAddress?.landmark;
  const pincode = order.customer?.pincode || order.deliveryAddress?.pincode;

  const addressBlock =
    order.orderType === 'Delivery'
      ? `📍 *Delivery Address:*\n${deliveryAddress}${
          landmark ? `\nLandmark: ${landmark}` : ''
        }${pincode ? `\nPincode: ${pincode}` : ''}`
      : `🏪 *Order Type:* Self-Pickup at Kitchen Cruze Restaurant`;

  const instructionsBlock = order.specialInstructions
    ? `\n📝 *Special Instructions:*\n"${order.specialInstructions}"\n`
    : '';

  const message = `*${settings.name.toUpperCase()}*
*FOOD ORDER DETAILS*
${divider}
🧾 *Order ID:* #${order.id}
👤 *Customer Name:* ${customerName}
📞 *Phone Number:* ${customerPhone}
${addressBlock}
${divider}
🍽️ *Ordered Items:*
${itemsList}
${divider}
💵 *Bill Summary:*
• Subtotal: ₹${order.subtotal}
• Delivery Charge: ₹${order.deliveryCharge}
• Discount: ${order.discount > 0 ? `-₹${order.discount} (${order.couponCode || 'Promo'})` : '₹0'}
*Grand Total: ₹${order.grandTotal}*
💳 Payment Mode: ${order.paymentMethod} (${order.paymentStatus})
${instructionsBlock}${divider}
🙏 Thank you for ordering with ${settings.name}!`;

  return message;
}

export function openWhatsAppOrder(order: Order, settings: RestaurantSettings) {
  const message = generateWhatsAppOrderMessage(order, settings);
  const rawPhone = settings.whatsappNumber || settings.phone || '';
  const cleanPhone = rawPhone.replace(/[^0-9]/g, '');
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
