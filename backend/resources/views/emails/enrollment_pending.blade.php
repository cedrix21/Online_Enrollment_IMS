<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { padding: 20px; border: 1px solid #eee; border-radius: 10px; }
        .header { color: #b8860b; font-size: 20px; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 12px; color: #777; }
        .reminder { background-color: #fff3e0; border-left: 4px solid #f57c00; padding: 12px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">Enrollment Submitted!</div>
        <p>Dear Parent/Guardian of <strong>{{ $enrollment->firstName }}</strong>,</p>

        <p>We have received your child's enrollment application for {{ $enrollment->gradeLevel }}. Your application is now <strong>pending review</strong>. Our registrar will process it shortly.</p>

        @if($paymentMethod === 'Cash')
        <div class="reminder">
            <strong>Payment Reminder</strong><br>
            You have selected <strong>Walk-in (Cash)</strong> as your payment method. Please visit the school Registrar's office to settle the downpayment to complete your child's enrollment. Bring a copy of this email or your child's name for reference.
        </div>
        @else
        <p>Your payment of ₱{{ number_format($enrollment->payments->first()->amount_paid ?? 0, 2) }} via {{ $paymentMethod }} has been recorded and will be verified.</p>
        @endif

        <p>Once your payment is confirmed (or received), your enrollment will be approved and you will receive a confirmation email with the official load slip.</p>

        <p>If you have any questions, feel free to contact the Registrar's office.</p>

        <div class="footer">
            <p>SICS Registrar Department<br>
            Siloam International Christian School</p>
        </div>
    </div>
</body>
</html>