<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; margin: 0; padding: 0; }
        
        /* Watermark Styling */
        #watermark {
            position: fixed;
            top: 25%;
            left: 15%;
            width: 70%;
            z-index: -1000;
            opacity: 0.1; /* Faded look */
            text-align: center;
        }
        #watermark img {
            width: 450px;
            height: auto;
        }

        .slip-header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .slip-header-text h1 { color: #b8860b; margin: 0; font-size: 22px; }
        .slip-header-text h3 { margin: 5px 0; font-size: 16px; color: #444; }
        .slip-header-text p { margin: 0; font-size: 14px; }
        
        .slip-info-summary { width: 100%; margin-top: 20px; border-bottom: 2px solid #f7e14b; padding-bottom: 10px; }
        .info-col { width: 49%; display: inline-block; vertical-align: top; }
        
        .slip-table { width: 100%; border-collapse: collapse; margin-top: 20px; background-color: transparent; }
        .slip-table th { background-color: #f7e14b; padding: 10px; text-align: left; border: 1px solid #e0d8b0; }
        .slip-table td { padding: 10px; border: 1px solid #e0d8b0; font-size: 12px; background-color: transparent; }

        .slip-footer { margin-top: 60px; width: 100%; }
        .sig-box { width: 48%; display: inline-block; text-align: center; }
        .line { border-top: 1px solid #000; width: 80%; margin: 0 auto; margin-bottom: 5px; }
        .sig-box p { margin: 0; font-size: 13px; font-weight: bold; }
    </style>
</head>
<body>
    <div id="watermark">
        <img src="{{ $logo }}" alt="SICS Watermark">
    </div>

    <table class="slip-header-table">
        <tr>
            <td style="width: 80px;">
                <img src="{{ $logo }}" style="width: 80px; height: auto;">
            </td>
            <td class="slip-header-text" style="text-align: center; padding-right: 80px;">
                <h1>SILOAM INTERNATIONAL CHRISTIAN SCHOOL</h1>
                <h3>Official Student Load Slip</h3>
                <p>Academic Year 2025-2026</p>
            </td>
        </tr>
    </table>

    <div class="slip-info-summary">
        <div class="info-col">
            <p><strong>Student Name:</strong> {{ strtoupper($enrollment->lastName) }}, {{ $enrollment->firstName }}</p>
            <p><strong>Student ID:</strong> {{ $studentId }}</p>
            <p><strong>Section:</strong> {{ $section->name }}</p>
        </div>
        <div class="info-col" style="text-align: right;">
            <p><strong>Adviser:</strong> {{ $section->advisor->lastName ?? 'TBA' }}</p>
            <p><strong>Date:</strong> {{ date('m/d/Y') }}</p>
        </div>
    </div>

    <table class="slip-table">
        <thead>
            <tr>
                <th>Subject</th>
                <th>Day</th>
                <th>Time</th>
                <th>Room</th>
            </tr>
        </thead>
        <tbody>
            @forelse($section->schedules as $sched)
            <tr>
                <td>{{ $sched->subject->subjectName }}</td>
                <td>{{ $sched->day }}</td>
                <td>{{ $sched->timeSlot->start_time }} - {{ $sched->timeSlot->end_time }}</td>
                <td>{{ $sched->room->room_name ?? 'TBA' }}</td>
            </tr>
            @empty
            <tr>
                <td colspan="4" style="text-align: center;">No schedules assigned yet.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="slip-footer">
        <div class="sig-box">
            <div class="line" style="margin-top: 40px;"></div>
            <p>School Registrar</p>
        </div>
        <div class="sig-box">
            <div class="line" style="margin-top: 40px;"></div>
            <p>Parent Signature</p>
        </div>
    </div>
</body>
</html>