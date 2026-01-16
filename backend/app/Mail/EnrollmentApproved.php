<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EnrollmentApproved extends Mailable
{
    use Queueable, SerializesModels;

    public $enrollment;
    public $pdfContent;

    /**
     * Create a new message instance.
     */
    public function __construct($enrollment, $pdfContent)
    {
        $this->enrollment = $enrollment;
        $this->pdfContent = $pdfContent;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Enrollment Confirmed - Siloam International Christian School',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.enrollment_approved', // We will create this next
        );
    }

    /**
     * Get the attachments for the message.
     */
    public function attachments(): array
    {
        return [
            Attachment::fromData(fn () => $this->pdfContent, 'Official_Loadslip.pdf')
                ->withMime('application/pdf'),
        ];
    }
}