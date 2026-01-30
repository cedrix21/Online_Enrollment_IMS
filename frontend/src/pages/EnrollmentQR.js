import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; // Changed to Canvas for reliable downloads
import sicsLogo from '../assets/sics-logo.png';

export default function EnrollmentQR() {
    const enrollUrl = "https://online-enrollment-system.up.railway.app/enroll";
    const qrContainerRef = useRef();

    const downloadQR = () => {
        // Find the canvas element inside the container
        const canvas = qrContainerRef.current.querySelector("canvas");
        if (!canvas) return;

        // Create a temporary link to trigger download
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = "SICS-Enrollment-QR.png";
        downloadLink.href = pngFile;
        downloadLink.click();
    };

    return (
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
            
            {/* WRAPPER FOR PRINTING */}
            <div id="printable-qr" style={{
                background: 'white',
                padding: '30px',
                borderRadius: '15px',
                display: 'inline-block',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                width: '320px', // Fixed width to prevent cutting
                textAlign: 'center',
                margin: '0 auto'
            }}>
                <img src={sicsLogo} alt="Logo" style={{ width: '60px', marginBottom: '5px' }} />
                <h2 style={{ color: '#1a237e', margin: '0', fontSize: '20px' }}>SICS</h2>
                <p style={{ color: '#546e7a', fontSize: '14px', marginBottom: '20px' }}>OFFICIAL ENROLLMENT QR</p>

                <div ref={qrContainerRef} style={{ display: 'inline-block', padding: '10px', background: 'white' }}>
                    <QRCodeCanvas
                        value={enrollUrl}
                        size={250} // Slightly smaller to ensure it fits one page
                        level="H"
                        marginSize={2}
                        imageSettings={{
                            src: sicsLogo,
                            height: 50,
                            width: 50,
                            excavate: true,
                        }}
                    />
                </div>

                <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <p style={{ color: '#90a4ae', fontSize: '11px', margin: 0 }}>
                        Powered by <strong>SICS Management System</strong>
                    </p>
                </div>
            </div>

            {/* ACTION BUTTONS (Hidden on Print) */}
            <div className="no-print" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button onClick={downloadQR} style={btnStyle('#3949ab')}>Download PNG</button>
                <button onClick={() => window.print()} style={btnStyle('#43a047')}>Print Flyer</button>
            </div>

            <style>
                {`
                    @media print {
                        /* 1. Hide everything else */
                        body * { visibility: hidden; }
                        
                        /* 2. Show only the QR card */
                        #printable-qr, #printable-qr * { visibility: visible; }
                        
                        /* 3. Position precisely for print */
                        #printable-qr { 
                            position: absolute; 
                            left: 50%; 
                            top: 40px; 
                            transform: translateX(-50%);
                            box-shadow: none !important;
                            border: 1px solid #eee !important;
                            break-inside: avoid; /* Prevents splitting into two pages */
                            page-break-inside: avoid;
                        }

                        /* 4. Completely hide buttons */
                        .no-print { display: none !important; }

                        /* 5. Force background colors to show in print */
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                `}
            </style>
        </div>
    );
}

const btnStyle = (bg) => ({
    padding: '10px 20px',
    backgroundColor: bg,
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
});