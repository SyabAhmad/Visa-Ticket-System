import { Printer, X } from 'lucide-react';

export default function PrintSlip({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  const handlePrint = () => {
    const printContent = document.getElementById('print-slip-content');
    const sanitizedHTML = printContent.innerText;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #2E2E2E;
            font-size: 12px;
            line-height: 1.5;
          }
          .slip {
            width: 100%;
            max-width: 180mm;
            margin: 0 auto;
            border: 2px solid #2E2E2E;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #ccc;
            padding-bottom: 15px;
            margin-bottom: 15px;
          }
          .header h1 {
            font-size: 20px;
            font-weight: bold;
            color: #2E2E2E;
            letter-spacing: 2px;
          }
          .header p {
            font-size: 11px;
            color: #4A4A4A;
            margin-top: 4px;
          }
          .title {
            text-align: center;
            margin-bottom: 15px;
          }
          .title h2 {
            font-size: 16px;
            font-weight: 600;
            color: #E74C3C;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .title .date {
            font-size: 11px;
            color: #888;
            margin-top: 4px;
          }
          .section-title {
            font-size: 11px;
            font-weight: 600;
            color: #E74C3C;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 15px;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #E74C3C;
          }
          .row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            border-bottom: 1px dotted #eee;
          }
          .row:last-child {
            border-bottom: none;
          }
          .row .label {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
          }
          .row .value {
            font-size: 12px;
            color: #2E2E2E;
            font-weight: 500;
            text-align: right;
          }
          .row .value.bold {
            font-weight: 700;
          }
          .row .value.green {
            color: #1e8e3e;
          }
          .row .value.red {
            color: #E74C3C;
          }
          .footer {
            border-top: 2px dashed #ccc;
            margin-top: 20px;
            padding-top: 15px;
            text-align: center;
          }
          .footer p {
            font-size: 10px;
            color: #888;
          }
          .text-area {
            font-size: 11px;
            color: #4A4A4A;
            background: #f9f9f9;
            padding: 10px;
            border-radius: 4px;
            margin-top: 8px;
            white-space: pre-wrap;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e0e0e0]">
          <h3 className="text-[15px] font-medium text-[#2E2E2E]">{title}</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-[#E74C3C] text-white rounded-full text-[12px] font-medium hover:bg-[#C0392B] transition-colors">
              <Printer size={14} /> Print A4
            </button>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#f0f0f0]">
              <X size={18} className="text-[#4A4A4A]" />
            </button>
          </div>
        </div>

        {/* Slip Preview */}
        <div className="p-5 max-h-[70vh] overflow-auto bg-[#f5f5f5]">
          <div id="print-slip-content" className="bg-white border-2 border-[#2E2E2E] rounded-lg p-6">
            {/* Slip Header */}
            <div className="text-center border-b-2 border-dashed border-[#ccc] pb-4 mb-4">
              <h1 className="text-[20px] font-bold text-[#2E2E2E] tracking-[2px]">VISA & TICKET SYSTEM</h1>
              <p className="text-[11px] text-[#4A4A4A] mt-1">Agency Management</p>
            </div>

            {/* Slip Title */}
            <div className="text-center mb-4">
              <h2 className="text-[16px] font-semibold text-[#E74C3C] uppercase tracking-[1px]">{title}</h2>
              <p className="text-[11px] text-[#888] mt-1">Date: {new Date().toLocaleDateString()}</p>
            </div>

            {/* Slip Content */}
            <div className="space-y-0">
              {children}
            </div>

            {/* Slip Footer */}
            <div className="border-t-2 border-dashed border-[#ccc] mt-5 pt-4 text-center">
              <p className="text-[10px] text-[#888]">Thank you for your business</p>
              <p className="text-[10px] text-[#888]">Generated: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable slip row component
export function SlipRow({ label, value, bold, color }) {
  let valueClass = 'text-[12px] text-[#2E2E2E] font-medium text-right';
  if (bold) valueClass += ' font-bold';
  if (color === 'green') valueClass += ' text-[#1e8e3e]';
  if (color === 'red') valueClass += ' text-[#E74C3C]';

  return (
    <div className="row">
      <span className="label">{label}</span>
      <span className={valueClass}>{value || '—'}</span>
    </div>
  );
}

// Reusable slip section header
export function SlipSection({ title }) {
  return (
    <div className="section-title">{title}</div>
  );
}
