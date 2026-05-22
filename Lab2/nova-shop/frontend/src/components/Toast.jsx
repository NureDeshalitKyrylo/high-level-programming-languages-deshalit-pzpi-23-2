import { useState } from 'react';

let _setToasts;
export function toast(msg, type = 'success') {
  const id = Date.now();
  _setToasts?.(t => [...t, { id, msg, type }]);
  setTimeout(() => _setToasts?.(t => t.filter(x => x.id !== id)), 3500);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  _setToasts = setToasts;
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
      ))}
    </div>
  );
}

export default ToastContainer;
