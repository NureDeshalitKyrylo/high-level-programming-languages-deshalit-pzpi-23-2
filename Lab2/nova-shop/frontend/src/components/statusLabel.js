export default function statusLabel(s) {
  return {
    pending: 'Очікує', confirmed: 'Підтверджено', processing: 'Обробка', shipped: 'Відправлено',
    delivered: 'Доставлено', cancelled: 'Скасовано', refunded: 'Повернення'
  }[s] || s;
}
