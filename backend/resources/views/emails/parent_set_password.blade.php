<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { padding: 20px; border: 1px solid #eee; border-radius: 10px; }
        .header { color: #b8860b; font-size: 20px; font-weight: bold; }
        .button { display: inline-block; background-color: #b8860b; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 20px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        @if($isReset)
            <div class="header">Reset Your Password</div>
            <p>Dear {{ $parentName }},</p>
            <p>You requested to reset your password for your parent account. Click the button below to set a new password.</p>
        @else
            <div class="header">Welcome to Siloam International Christian School!</div>
            <p>Dear {{ $parentName }},</p>
            <p>Your child's enrollment has been approved. To access your parent portal where you can view your child's profile, payment balance, and load slip, please set up your password by clicking the button below.</p>
        @endif
        <a href="{{ $url }}" class="button">Set Your Password</a>

        <p><small>This link will expire in 24 hours. If you did not expect this email, please disregard it.</small></p>

        <div class="footer">
            <p>SICS Registrar Department<br>
            Siloam International Christian School</p>
        </div>
    </div>
</body>
</html>