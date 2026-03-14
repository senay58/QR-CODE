import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../hooks/useAuth';

const AdminQR = () => {
    const { restaurantSlug } = useAuth();
    const [customerType, setCustomerType] = useState('walkin');
    const [entityId, setEntityId] = useState('1');
    const [baseUrlInput, setBaseUrlInput] = useState(window.location.origin);

    // If deployed, baseUrlInput will let them change it to "https://ironplate.app"
    const qrUrl = `${baseUrlInput}/r/${restaurantSlug || 'unknown'}/?type=${customerType}&id=${encodeURIComponent(entityId)}`;

    return (
        <div>
            <header className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">QR Code Generator</h2>
                <p className="text-muted-foreground text-sm">Generate printable QR links for Walk-ins or Apartments.</p>
            </header>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-card rounded-xl shadow-sm border border-border p-6 text-foreground">
                    <label className="block text-sm font-medium mb-2">Base App URL (For Scanning)</label>
                    <input
                        type="text"
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none mb-4 bg-background"
                        value={baseUrlInput}
                        onChange={(e) => setBaseUrlInput(e.target.value)}
                        placeholder="https://..."
                    />

                    <label className="block text-sm font-medium mb-2">Customer Type</label>
                    <select
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none mb-4 bg-background"
                        value={customerType}
                        onChange={(e) => setCustomerType(e.target.value)}
                    >
                        <option value="walkin">Walk-in (Table)</option>
                        <option value="apartment">Apartment (Room)</option>
                    </select>

                    <label className="block text-sm font-medium mb-2">
                        {customerType === 'walkin' ? 'Table Number/Name' : 'Room Number'}
                    </label>
                    <input
                        type="text"
                        className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none mb-6 bg-background"
                        value={entityId}
                        onChange={(e) => setEntityId(e.target.value)}
                        placeholder={customerType === 'walkin' ? "e.g. 5, Patio 1" : "e.g. 401"}
                    />

                    <p className="text-sm text-foreground/50 mb-2">Generated URL:</p>
                    <code className="text-xs bg-secondary p-2 rounded block break-all mb-4 text-foreground">{qrUrl}</code>
                </div>

                <div className="bg-white dark:bg-card rounded-xl flex flex-col items-center justify-center p-8 border border-gray-200 dark:border-border">
                    <div className="p-4 bg-white border border-gray-100 shadow-md rounded-xl mb-4">
                        <QRCodeSVG value={qrUrl} size={200} level="H" />
                    </div>
                    <p className="font-bold text-lg text-foreground">
                        {customerType === 'walkin' ? `Table ${entityId}` : `Room ${entityId}`}
                    </p>
                    <p className="text-sm text-gray-500">Scan to {customerType === 'walkin' ? 'view menu' : 'order'}</p>
                </div>
            </div>
        </div>
    );
};

export default AdminQR;
