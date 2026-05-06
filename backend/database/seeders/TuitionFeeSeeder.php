<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\TuitionFee;
use App\Models\MiscFeeItem;

class TuitionFeeSeeder extends Seeder
{
    public function run(): void
    {
        $schoolYear = '2025-2026';

        $bookFees = [
            'Nursery'        => 1579,
            'Kindergarten 1' => 2241,
            'Kindergarten 2' => 1642,
            'Grade 1'        => 4629,
            'Grade 2'        => 4879,
            'Grade 3'        => 4859,
            'Grade 4'        => 5488,
            'Grade 5'        => 5488,
            'Grade 6'        => 5488,
        ];

        $data = [
            'Nursery' => [
                'tuition_fee' => 26288, 'korean_fee' => 0,
                'book_fee' => $bookFees['Nursery'],
                'misc' => [
                    ['Registration Fee', 500], ['Instructional Materials Fee', 680],
                    ['Library Fee', 350], ['Energy Fee', 1490], ['School I.D', 205],
                    ['Activities Fee', 590], ['Playground Fee', 507],
                    ['Guidance and Counselling Fee', 400], ['Learning Management System Fee', 530],
                ],
            ],
            'Kindergarten 1' => [
                'tuition_fee' => 26838, 'korean_fee' => 0,
                'book_fee' => $bookFees['Kindergarten 1'],
                'misc' => [
                    ['Registration Fee', 500], ['Instructional Materials Fee', 680],
                    ['Library Fee', 350], ['Energy Fee', 1490], ['School I.D', 205],
                    ['Activities Fee', 590], ['Playground Fee', 607],
                    ['Guidance and Counselling Fee', 300], ['Learning Management System Fee', 530],
                ],
            ],
            'Kindergarten 2' => [
                'tuition_fee' => 26988, 'korean_fee' => 0,
                'book_fee' => $bookFees['Kindergarten 2'],
                'misc' => [
                    ['Registration Fee', 500], ['Instructional Materials Fee', 680],
                    ['Library Fee', 350], ['Energy Fee', 1490], ['School I.D', 205],
                    ['Activities Fee', 590], ['Playground Fee', 607],
                    ['Guidance and Counselling Fee', 300], ['Learning Management System Fee', 530],
                    ['Graduation Fee', 250],
                ],
            ],
            'Grade 1' => [
                'tuition_fee' => 30582, 'korean_fee' => 1500,
                'book_fee' => $bookFees['Grade 1'],
                'misc' => [
                    ['Registration Fee', 500], ['Instructional Materials Fee', 480],
                    ['Library Fee', 350], ['Energy Fee', 1490], ['School I.D', 205],
                    ['Activities Fee', 590], ['Handbook', 607],
                    ['Guidance and Counselling Fee', 300], ['Test Printing Fee', 200],
                    ['Learning Management System Fee', 430],
                ],
            ],
            'Grade 2' => [
                'tuition_fee' => 30582, 'korean_fee' => 1500,
                'book_fee' => $bookFees['Grade 2'],
                'misc' => [
                    ['Registration Fee', 500], ['Instructional Materials Fee', 480],
                    ['Library Fee', 350], ['Energy Fee', 1490], ['School I.D', 205],
                    ['Activities Fee', 590], ['Handbook', 607],
                    ['Guidance and Counselling Fee', 300], ['Test Printing Fee', 200],
                    ['Learning Management System Fee', 430],
                ],
            ],
            'Grade 3' => [
                'tuition_fee' => 30582, 'korean_fee' => 1500,
                'book_fee' => $bookFees['Grade 3'],
                'misc' => [
                    ['Registration Fee', 500], ['Instructional Materials Fee', 480],
                    ['Library Fee', 350], ['Energy Fee', 1490], ['School I.D', 205],
                    ['Activities Fee', 590], ['Handbook', 607],
                    ['Guidance and Counselling Fee', 300], ['Test Printing Fee', 200],
                    ['Learning Management System Fee', 430],
                ],
            ],
            'Grade 4' => [
                'tuition_fee' => 30582, 'korean_fee' => 1500,
                'book_fee' => $bookFees['Grade 4'],
                'misc' => [
                    ['Registration Fee', 500], ['Instructional Materials Fee', 480],
                    ['Library Fee', 350], ['Energy Fee', 1490], ['School I.D', 205],
                    ['Activities Fee', 590], ['Handbook', 607],
                    ['Guidance and Counselling Fee', 300], ['Test Printing Fee', 200],
                    ['Computer Fee', 300], ['Agricultural Fee', 238],
                    ['Learning Management System Fee', 430],
                ],
            ],
            'Grade 5' => [
                'tuition_fee' => 30582, 'korean_fee' => 1500,
                'book_fee' => $bookFees['Grade 5'],
                'misc' => [
                    ['Registration Fee', 500], ['Instructional Materials Fee', 480],
                    ['Library Fee', 350], ['Energy Fee', 1490], ['School I.D', 205],
                    ['Activities Fee', 590], ['Handbook', 607],
                    ['Guidance and Counselling Fee', 300], ['Test Printing Fee', 200],
                    ['Computer Fee', 300], ['Agricultural Fee', 238],
                    ['Learning Management System Fee', 430],
                ],
            ],
            'Grade 6' => [
                'tuition_fee' => 30582, 'korean_fee' => 1500,
                'book_fee' => $bookFees['Grade 6'],
                'misc' => [
                    ['Registration Fee', 500], ['Instructional Materials Fee', 480],
                    ['Library Fee', 350], ['Energy Fee', 1490], ['School I.D', 205],
                    ['Activities Fee', 590], ['Handbook', 607],
                    ['Guidance and Counselling Fee', 300], ['Test Printing Fee', 200],
                    ['Computer Fee', 300], ['Agricultural Fee', 238],
                    ['Learning Management System Fee', 430],
                    ['Graduation Fee', 250], ['Alumni Fee', 250],
                ],
            ],
        ];

        foreach ($data as $gradeLevel => $info) {
            $tuitionFee = TuitionFee::updateOrCreate(
                [
                    'grade_level' => $gradeLevel,
                    'school_year' => $schoolYear,
                ],
                [
                    'tuition_fee'   => $info['tuition_fee'],
                    'korean_fee'    => $info['korean_fee'],
                    'book_fee'      => $info['book_fee'],   // ← added
                    'down_payment'  => 5000,
                    'monthly_terms' => 10,
                    'is_active'     => true,
                ]
            );

            foreach ($info['misc'] as $i => [$label, $amount]) {
                MiscFeeItem::updateOrCreate(
                    [
                        'tuition_fee_id' => $tuitionFee->id,
                        'label'          => $label,
                    ],
                    [
                        'amount'     => $amount,
                        'sort_order' => $i,
                    ]
                );
            }
        }
    }
}
//php artisan db:seed --class=TuitionFeeSeeder