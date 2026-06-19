export const PRODUCT_CATEGORY_MAP: Record<string, string> = {
  'Onyx Orthopedic Office Chair': 'Chair',
  'Stylux Ergonomic Office Chair': 'Chair',
  'XGen Pro Gaming Chair': 'Chair',
  'Ultron Premium Ergonomic Office Chair': 'Chair',
  'Tranquo Massager Office Chair': 'Chair',
  'UNO Ergonomic Office Chair': 'Chair',
  'Flex Ergonomic Office Chair': 'Chair',
  'Max Executive Office Chair': 'Chair',
  'XGen Gaming Chair': 'Chair',
  'Elite Premium Office Chair': 'Chair',
  'Height Adjustable Desk': 'Desk',
  'All Weather Comforter': 'Accessories',
  'Seat Cushion': 'Accessories',
  'Wedge Cushion': 'Accessories',
  'Foot Massager': 'Foot Massager',
  'Recliner Bed': 'Bed',
  'Elite Sofa': 'Elite',
  'Recliner Sofa - Revolving': 'Sofa',
  'Recliner Sofa - Non-Revolving': 'Sofa',
  'Luxe Pro Massager Recliner Sofa': 'Sofa',
  'Luxe Motorised Recliner Sofa': 'Sofa',
};

export function getCategoryForProduct(productName: string): string {
  return PRODUCT_CATEGORY_MAP[productName] || 'Mattress';
}
