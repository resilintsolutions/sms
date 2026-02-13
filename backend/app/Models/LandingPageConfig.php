<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LandingPageConfig extends Model
{
    protected $fillable = ['institution_id', 'config'];

    /** Laravel 8: use $casts property (casts() method is Laravel 9+) */
    protected $casts = ['config' => 'array'];

    public function institution(): BelongsTo
    {
        return $this->belongsTo(Institution::class);
    }

    /**
     * Merge request config into defaults so every key exists. Deep merge for associative arrays;
     * replace list arrays (e.g. features) when provided.
     */
    public static function mergeWithDefaults(array $config): array
    {
        $default = self::defaultConfig();
        return self::deepMerge($default, $config);
    }

    /**
     * Recursive merge: $override wins. For numeric arrays (e.g. features) replace entirely when present.
     */
    public static function deepMerge(array $default, array $override): array
    {
        $result = $default;
        foreach ($override as $key => $value) {
            if (! array_key_exists($key, $result)) {
                $result[$key] = $value;
                continue;
            }
            if (is_array($value) && is_array($result[$key])) {
                if (array_is_list($value)) {
                    $result[$key] = $value;
                } else {
                    $result[$key] = self::deepMerge($result[$key], $value);
                }
            } else {
                $result[$key] = $value;
            }
        }
        return $result;
    }

    public static function defaultConfig(): array
    {
        return [
            'site' => [
                'logoUrl' => '',
                'schoolName' => 'Our School',
                'schoolName_bn' => 'আমাদের স্কুল',
                'bannerImageUrl' => '',
            ],
            'header' => [
                'topBarEnabled' => true,
                'topBarLeft' => 'Welcome to Our School',
                'topBarLeft_bn' => 'আমাদের স্কুলে স্বাগতম',
                'topBarRight' => 'Mon–Fri 8AM–4PM',
                'topBarRight_bn' => 'সোম–শুক্র সকাল ৮টা–বিকাল ৪টা',
            ],
            'nav' => [
                'links' => [
                    ['label' => 'Home', 'label_bn' => 'হোম', 'href' => '#'],
                    ['label' => 'About', 'label_bn' => 'আমাদের সম্পর্কে', 'href' => '#about'],
                    ['label' => 'Academic Info', 'label_bn' => 'একাডেমিক তথ্য', 'href' => '#academic'],
                    ['label' => 'Admission', 'label_bn' => 'ভর্তি', 'href' => '#admission'],
                    ['label' => 'News & Events', 'label_bn' => 'খবর ও ইভেন্ট', 'href' => '#news'],
                    ['label' => 'Contact', 'label_bn' => 'যোগাযোগ', 'href' => '#contact'],
                ],
            ],
            'hero' => [
                'title' => 'Welcome to Our School',
                'title_bn' => 'আমাদের স্কুলে স্বাগতম',
                'subtitle' => 'Quality education for a brighter future.',
                'subtitle_bn' => 'উজ্জ্বল ভবিষ্যতের জন্য মানসম্মত শিক্ষা।',
                'ctaText' => 'Login to Portal',
                'ctaLink' => '/login',
                'imageUrl' => '',
                'background' => 'gradient',
            ],
            'about' => [
                'heading' => 'About Our School',
                'heading_bn' => 'আমাদের স্কুল সম্পর্কে',
                'body' => 'We are committed to providing a nurturing environment where every student can excel academically and personally.',
                'body_bn' => 'আমরা এমন একটি পরিবেশ দেওয়ার জন্য প্রতিশ্রুতিবদ্ধ যেখানে প্রতিটি শিক্ষার্থী একাডেমিক এবং ব্যক্তিগতভাবে উৎকর্ষ অর্জন করতে পারে।',
                'imageUrl' => '',
            ],
            'academic' => [
                'enabled' => true,
                'heading' => 'Academic Information',
                'heading_bn' => 'একাডেমিক তথ্য',
                'body' => 'Our curriculum follows the national education board guidelines. We offer classes from Grade 1 to 12 with qualified teachers and modern facilities.',
                'body_bn' => 'আমাদের পাঠ্যক্রম জাতীয় শিক্ষা বোর্ডের নির্দেশিকা অনুসরণ করে। আমরা যোগ্য শিক্ষক এবং আধুনিক সুবিধা সহ ১ম থেকে ১২শ শ্রেণি পর্যন্ত ক্লাস অফার করি।',
                'highlights' => [
                    ['title' => 'National Curriculum', 'title_bn' => 'জাতীয় পাঠ্যক্রম', 'desc' => 'Board-approved syllabus'],
                    ['title' => 'Qualified Teachers', 'title_bn' => 'যোগ্য শিক্ষক', 'desc' => 'Experienced faculty'],
                    ['title' => 'Modern Labs', 'title_bn' => 'আধুনিক ল্যাব', 'desc' => 'Science & computer labs'],
                ],
            ],
            'admission' => [
                'enabled' => true,
                'heading' => 'Admission Information',
                'heading_bn' => 'ভর্তি তথ্য',
                'body' => 'Admissions are open for the new academic year. Visit our office with required documents or contact us for more information.',
                'body_bn' => 'নতুন একাডেমিক বছরের জন্য ভর্তি চলছে। প্রয়োজনীয় নথিপত্র নিয়ে আমাদের অফিসে আসুন বা আরও তথ্যের জন্য যোগাযোগ করুন।',
                'requirements' => 'Birth certificate, previous school records, passport-size photos.',
                'requirements_bn' => 'জন্ম নিবন্ধন, পূর্ববর্তী স্কুলের রেকর্ড, পাসপোর্ট সাইজের ছবি।',
                'contactInfo' => 'For admission inquiries, visit the office during 9 AM - 3 PM.',
                'contactInfo_bn' => 'ভর্তি সম্পর্কিত জিজ্ঞাসার জন্য সকাল ৯টা থেকে বিকাল ৩টার মধ্যে অফিসে আসুন।',
            ],
            'features' => [
                ['title' => 'Quality Education', 'title_bn' => 'মানসম্মত শিক্ষা', 'description' => 'Experienced teachers and modern curriculum.', 'icon' => 'GraduationCap'],
                ['title' => 'Safe Environment', 'title_bn' => 'নিরাপদ পরিবেশ', 'description' => 'Secure and supportive campus.', 'icon' => 'Shield'],
                ['title' => 'Parent Portal', 'title_bn' => 'অভিভাবক পোর্টাল', 'description' => 'Track attendance, fees, and results online.', 'icon' => 'Users'],
            ],
            'contact' => [
                'email' => 'info@school.edu.bd',
                'phone' => '+880 1XXX-XXXXXX',
                'address' => 'School Address, City, Bangladesh',
                'address_bn' => 'স্কুলের ঠিকানা, শহর, বাংলাদেশ',
                'mapEmbed' => '',
                'showSection' => true,
                'showContactForm' => true,
            ],
            'footer' => [
                'aboutTitle' => 'About Us',
                'aboutTitle_bn' => 'আমাদের সম্পর্কে',
                'aboutText' => 'Empowering students with quality education since day one.',
                'aboutText_bn' => 'প্রথম দিন থেকেই মানসম্মত শিক্ষা দিয়ে শিক্ষার্থীদের ক্ষমতায়ন করা।',
                'linksTitle' => 'Quick Links',
                'linksTitle_bn' => 'দ্রুত লিঙ্ক',
                'quickLinks' => [
                    ['label' => 'About', 'label_bn' => 'আমাদের সম্পর্কে', 'href' => '#about'],
                    ['label' => 'Notices', 'label_bn' => 'নোটিশ', 'href' => '#notices'],
                    ['label' => 'Contact', 'label_bn' => 'যোগাযোগ', 'href' => '#contact'],
                    ['label' => 'Login', 'label_bn' => 'লগইন', 'href' => '/login'],
                ],
                'contactTitle' => 'Contact Us',
                'contactTitle_bn' => 'যোগাযোগ',
                'text' => 'Empowering students since day one.',
                'copyright' => '© 2024 School Name. All rights reserved.',
                'facebook' => '',
                'youtube' => '',
                'twitter' => '',
                'instagram' => '',
                'linkedin' => '',
            ],
            'heroSlides' => [
                'enabled' => true,
                'autoPlayInterval' => 5000,
                'slides' => [
                    [
                        'imageUrl' => '',
                        'title' => 'Welcome to Our School',
                        'title_bn' => 'আমাদের স্কুলে স্বাগতম',
                        'subtitle' => 'Quality education for a brighter future.',
                        'subtitle_bn' => 'উজ্জ্বল ভবিষ্যতের জন্য মানসম্মত শিক্ষা।',
                        'overlayOpacity' => 70,
                    ],
                    [
                        'imageUrl' => '',
                        'title' => 'Excellence in Education',
                        'title_bn' => 'শিক্ষায় শ্রেষ্ঠত্ব',
                        'subtitle' => 'Building leaders of tomorrow with modern facilities.',
                        'subtitle_bn' => 'আধুনিক সুবিধা দিয়ে আগামীর নেতা তৈরি।',
                        'overlayOpacity' => 70,
                    ],
                    [
                        'imageUrl' => '',
                        'title' => 'Join Our Community',
                        'title_bn' => 'আমাদের পরিবারে যোগ দিন',
                        'subtitle' => 'Admissions open for the new academic year.',
                        'subtitle_bn' => 'নতুন শিক্ষাবর্ষের জন্য ভর্তি চলছে।',
                        'overlayOpacity' => 70,
                    ],
                ],
            ],
            'stats' => [
                'enabled' => true,
                'items' => [
                    ['icon' => 'Users', 'value' => 500, 'suffix' => '+', 'label' => 'Students', 'label_bn' => 'শিক্ষার্থী'],
                    ['icon' => 'GraduationCap', 'value' => 50, 'suffix' => '+', 'label' => 'Teachers', 'label_bn' => 'শিক্ষক'],
                    ['icon' => 'Award', 'value' => 95, 'suffix' => '%', 'label' => 'Pass Rate', 'label_bn' => 'পাসের হার'],
                    ['icon' => 'Star', 'value' => 20, 'suffix' => '+', 'label' => 'Years', 'label_bn' => 'বছর অভিজ্ঞতা'],
                ],
            ],
            'gallery' => [
                'enabled' => true,
                'heading' => 'Our Campus Gallery',
                'heading_bn' => 'আমাদের ক্যাম্পাস গ্যালারি',
                'subtitle' => 'Explore our vibrant campus life through images',
                'subtitle_bn' => 'ছবির মাধ্যমে আমাদের প্রাণবন্ত ক্যাম্পাস জীবন দেখুন',
                'images' => [],
            ],
            'testimonials' => [
                'enabled' => true,
                'heading' => 'What People Say',
                'heading_bn' => 'মানুষ কি বলে',
                'items' => [
                    ['name' => 'Parent', 'name_bn' => 'অভিভাবক', 'role' => 'Guardian', 'role_bn' => 'অভিভাবক', 'text' => 'This school has transformed my child\'s learning experience.', 'text_bn' => 'এই স্কুল আমার সন্তানের শিক্ষার অভিজ্ঞতা পরিবর্তন করেছে।', 'imageUrl' => '', 'rating' => 5],
                    ['name' => 'Alumni', 'name_bn' => 'প্রাক্তন ছাত্র', 'role' => 'Former Student', 'role_bn' => 'প্রাক্তন ছাত্র', 'text' => 'The values I learned here shaped my career.', 'text_bn' => 'এখানে শেখা মূল্যবোধ আমার ক্যারিয়ার গড়েছে।', 'imageUrl' => '', 'rating' => 5],
                ],
            ],
            'aboutGallery' => [
                'enabled' => true,
                'images' => [],
            ],
            'seo' => [
                'metaTitle' => 'School Name - Quality Education',
                'metaDescription' => 'Official website of our school. Admissions, notices, and more.',
            ],
            'notices' => [
                'enabled' => true,
                'maxItems' => 5,
                'sectionTitle' => 'News & Events',
                'sectionTitle_bn' => 'খবর ও ইভেন্ট',
            ],
        ];
    }
}
