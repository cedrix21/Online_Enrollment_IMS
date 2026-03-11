<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; margin: 0; padding: 0; }

        /* Watermark */
        #watermark {
            position: fixed;
            top: 25%;
            left: 15%;
            width: 70%;
            z-index: -1000;
            opacity: 0.1;
            text-align: center;
        }
        #watermark img { width: 450px; height: auto; }

        /* Header */
        .slip-header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .slip-header-text { text-align: center; padding-right: 80px; }
        .slip-header-text h1 { color: #b8860b; margin: 0; font-size: 22px; }
        .slip-header-text h3 { margin: 5px 0; font-size: 16px; color: #444; }
        .slip-header-text p  { margin: 0; font-size: 14px; }

        /* Info Summary — matches React's two-column layout */
        .slip-info-summary {
            width: 100%;
            margin-top: 20px;
            border-bottom: 2px solid #f7e14b;
            padding-bottom: 10px;
        }
        .info-row { width: 100%; }
        .info-col-left  { width: 49%; display: inline-block; vertical-align: top; }
        .info-col-right { width: 49%; display: inline-block; vertical-align: top; text-align: right; }
        .info-col-left p, .info-col-right p { margin: 4px 0; font-size: 13px; }
        .uppercase-name { text-transform: uppercase; }

        /* Schedule Table — matches React's 5-column table */
        .slip-table { width: 100%; border-collapse: collapse; margin-top: 20px; background-color: transparent; }
        .slip-table th {
            background-color: #f7e14b;
            padding: 10px;
            text-align: left;
            border: 1px solid #e0d8b0;
            font-size: 13px;
        }
        .slip-table td {
            padding: 10px;
            border: 1px solid #e0d8b0;
            font-size: 12px;
            background-color: transparent;
        }

        /* Notes — matches React's slip-notes block */
        .slip-notes {
            margin-top: 20px;
            font-size: 12px;
            color: #555;
            border-left: 3px solid #f7e14b;
            padding-left: 10px;
        }

        /* Footer signatures */
        .slip-footer { margin-top: 60px; width: 100%; }
        .sig-box { width: 48%; display: inline-block; text-align: center; }
        .line { border-top: 1px solid #000; width: 80%; margin: 0 auto; margin-bottom: 5px; }
        .sig-box p { margin: 0; font-size: 13px; font-weight: bold; }
    </style>
</head>
<body>

    {{-- Watermark --}}
    <div id="watermark">
        <img src="{{ $logo }}" alt="SICS Watermark">
    </div>

    {{-- Header: Logo + School Name --}}
    <table class="slip-header-table">
        <tr>
            <td style="width: 80px;">
                <img src="{{ $logo }}" style="width: 80px; height: auto;">
            </td>
            <td class="slip-header-text">
                <h1>SILOAM INTERNATIONAL CHRISTIAN SCHOOL</h1>
                <h3>Official Student Load Slip</h3>
                <p>Academic Year 2025-2026</p>
            </td>
        </tr>
    </table>

    {{-- Student Info: Two columns (matches React exactly) --}}
    <div class="slip-info-summary">
        <div class="info-col-left">
            <p><strong>Student Name:</strong> <span class="uppercase-name">{{ strtoupper($enrollment->lastName) }}, {{ $enrollment->firstName }}</span></p>
            <p><strong>Student ID:</strong> {{ $studentId }}</p>
            <p><strong>Section:</strong> {{ $section->name }}</p>
        </div>
        <div class="info-col-right">
            <p><strong>Grade Level:</strong> {{ $enrollment->gradeLevel }}</p>
            <p><strong>Adviser:</strong> {{ $section->advisor->lastName ?? 'TBA' }}</p>
            <p><strong>Date Issued:</strong> {{ date('m/d/Y') }}</p>
        </div>
    </div>

    {{-- Schedule Table: 5 columns (matches React's Subject/Days/Time/Room/Instructor) --}}
    <table class="slip-table">
        <thead>
            <tr>
                <th>Subject</th>
                <th>Days</th>
                <th>Time</th>
                <th>Room</th>
                <th>Instructor</th>
            </tr>
        </thead>
        <tbody>
            @php
                // Group schedules by subject+timeslot+room (same logic as React's getGroupedSchedules)
                $grouped = [];
                foreach ($section->schedules as $sched) {
                    $key = $sched->subject_id . '-' . $sched->time_slot_id . '-' . $sched->room_id;
                    if (!isset($grouped[$key])) {
                        $grouped[$key] = [
                            'subject'   => $sched->subject,
                            'time_slot'  => $sched->time_slot,
                            'room'      => $sched->room,
                            'teacher'   => $sched->teacher ?? null,
                            'days'      => [$sched->day],
                        ];
                    } else {
                        $grouped[$key]['days'][] = $sched->day;
                    }
                }

                // Sort days same as React's DAYS_ORDER
                $daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                foreach ($grouped as &$row) {
                    usort($row['days'], fn($a, $b) =>
                        array_search($a, $daysOrder) - array_search($b, $daysOrder)
                    );
                }
            @endphp

            @forelse($grouped as $row)
            <tr>
                <td><strong>{{ $row['subject']->subjectName ?? 'N/A' }}</strong></td>
                <td>
                    @php
                        $days = $row['days'];
                        // Match React: if >2 days, abbreviate to 3 chars
                        if (count($days) <= 2) {
                            echo implode(', ', $days);
                        } else {
                            echo implode(', ', array_map(fn($d) => substr($d, 0, 3), $days));
                        }
                    @endphp
                </td>
                <td>{{ $row['time_slot']->start_time ?? 'TBA' }} - {{ $row['time_slot']->end_time ?? '' }}</td>
                <td>{{ $row['room']->room_name ?? 'TBA' }}</td>
                <td>
                    @if($row['teacher'])
                        {{ $row['teacher']->firstName }} {{ $row['teacher']->lastName }}
                    @else
                        TBA
                    @endif
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="5" style="text-align: center;">No schedules assigned to this section.</td>
            </tr>
            @endforelse
        </tbody>
    </table>

    {{-- Notes block (matches React's slip-notes) --}}
    <div class="slip-notes">
        <p><strong>Note:</strong> This is an official document. Please keep it for your records.
        Any changes to the schedule will be announced by the school administration.</p>
    </div>

    {{-- Signature Footer --}}
    <div class="slip-footer">
        <div class="sig-box">
            <div class="line" style="margin-top: 40px;"></div>
            <p>School Registrar</p>
        </div>
        <div class="sig-box">
            <div class="line" style="margin-top: 40px;"></div>
            <p>Parent/Guardian Signature</p>
        </div>
    </div>

</body>
</html>