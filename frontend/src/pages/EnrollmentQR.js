import QRCode from "react-qr-code";

export default function EnrollmentQR() {
  const enrollUrl = "http://localhost:3000/enroll";

  return (
    <div style={{ textAlign: "center", padding: "40px" }}>
      <h2>Scan to Enroll</h2>
      <QRCode value={enrollUrl} size={256} />
      <p>Scan this QR code to access the enrollment form.</p>
    </div>
  );
}
