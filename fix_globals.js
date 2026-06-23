const fs = require('fs');
let css = fs.readFileSync('app/globals.css', 'utf8');

// Replace CSS Variables
css = css.replace(/--bg-color: [^;]+;/, '--bg-color: #0f1117;');
css = css.replace(/--surface-color: [^;]+;/, '--surface-color: #1a1d27;');
css = css.replace(/--surface-hover: [^;]+;/, '--surface-hover: #1f2333;');
css = css.replace(/--border-color: [^;]+;/, '--border-color: #2d3348;');
css = css.replace(/--accent-primary: [^;]+;/, '--accent-primary: #e8733a;');
css = css.replace(/--success-color: [^;]+;/, '--success-color: #48bb78;');
css = css.replace(/--danger-color: [^;]+;/, '--danger-color: #fc8181;');

// Replace Table CSS completely
const newTableCss = `
/* Tables */
.table-wrapper {
  background: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  box-shadow: none;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
  white-space: nowrap;
  font-size: 14px;
}

.modern-table thead {
  text-transform: uppercase;
  font-weight: bold;
}

.modern-table thead tr {
  background: #e8733a;
  color: #fff;
}

.modern-table th {
  padding: 12px 8px;
  color: #fff;
  font-weight: bold;
  font-size: 14px;
  text-transform: uppercase;
}

.modern-table tbody tr:nth-child(odd) {
  background-color: #1a1d27;
}

.modern-table tbody tr:nth-child(even) {
  background-color: #1f2333;
}

.modern-table tbody tr {
  border-bottom: 1px solid var(--border-color);
}

.modern-table tbody tr:hover {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

.modern-table td {
  padding: 12px 8px;
}

/* Total Row */
.modern-table tbody tr:last-child {
  background: #111 !important;
  font-weight: bold;
  border-top: 2px solid var(--border-color);
  position: sticky;
  bottom: 0;
  z-index: 5;
}

/* First Column Stickiness */
.modern-table th:first-child,
.modern-table td:first-child {
  padding: 12px 16px;
  text-align: left;
  position: sticky;
  left: 0;
  border-right: 1px solid var(--border-color);
}

.modern-table th:first-child {
  z-index: 10;
  background: #e8733a;
}

.modern-table td:first-child {
  z-index: 1;
}

.modern-table tbody tr:nth-child(odd) td:first-child {
  background-color: #1a1d27;
}
.modern-table tbody tr:nth-child(even) td:first-child {
  background-color: #1f2333;
}
.modern-table tbody tr:last-child td:first-child {
  background-color: #111 !important;
}

/* Scrollbars */
`;

css = css.replace(/\/\* Tables \*\/[\s\S]*?\/\* Scrollbars \*\//, newTableCss);

fs.writeFileSync('app/globals.css', css);
console.log('Fixed globals.css');
