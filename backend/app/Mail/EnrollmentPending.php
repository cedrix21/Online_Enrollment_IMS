<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EnrollmentPending extends Mailable
{
    use Queueable, SerializesModels;

    public $enrollment;
    public $paymentMethod;

    public function __construct($enrollment, $paymentMethod)
    {
        $this->enrollment = $enrollment;
        $this->paymentMethod = $paymentMethod;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Enrollment Submitted – Pending Approval',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.enrollment_pending',
        );
    }
}