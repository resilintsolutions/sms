<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\ContactFormMail;
use App\Models\Institution;
use App\Models\LandingPageConfig;
use App\Models\Notice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class LandingPageController extends Controller
{
    /**
     * Resolve institution ID from request context.
     * Priority: 1) ?institution_id= param  2) custom_domain match  3) subdomain match  4) default ID 1
     *
     * For custom domains (e.g. www.dtschool.edu.bd → institutions.custom_domain)
     * For subdomains (e.g. dt-school.sms.resilentsolutions.com → institutions.subdomain = 'dt-school')
     */
    protected function institutionId(): int
    {
        // 1. Explicit query parameter
        $id = request()->get('institution_id');
        if ($id !== null && $id !== '') {
            return (int) $id;
        }

        // Use X-Forwarded-Host (set by reverse proxy / Next.js API proxy) if available,
        // otherwise fall back to the standard Host header.
        $host = request()->header('X-Forwarded-Host') ?: request()->getHost();
        $host = preg_replace('/:\d+$/', '', $host); // strip port
        $hostNaked = preg_replace('/^www\./', '', $host);

        // 2. Check custom_domain match (e.g. school.edu.bd)
        $institution = Institution::where('custom_domain', $host)
            ->orWhere('custom_domain', $hostNaked)
            ->first();
        if ($institution) {
            return (int) $institution->id;
        }

        // 3. Check subdomain match (e.g. dt-school.sms.resilentsolutions.com)
        //    Extract the subdomain prefix from the PLATFORM_DOMAIN env
        $platformDomain = env('PLATFORM_DOMAIN', 'sms.resilentsolutions.com');
        $platformDomainEscaped = preg_quote($platformDomain, '/');
        if (preg_match('/^(.+)\.' . $platformDomainEscaped . '$/i', $hostNaked, $matches)) {
            $subdomainSlug = strtolower($matches[1]);
            $institution = Institution::where('subdomain', $subdomainSlug)->first();
            if ($institution) {
                return (int) $institution->id;
            }
        }

        // 4. Default to institution 1
        return 1;
    }

    /**
     * Public: get landing page config and latest notices (no auth).
     * Config is always merged with defaults so all keys (site, hero, etc.) exist.
     */
    public function show(): JsonResponse
    {
        try {
            $institutionId = $this->institutionId();
            $row = LandingPageConfig::where('institution_id', $institutionId)->first();

            $payload = $row
                ? LandingPageConfig::mergeWithDefaults($row->config)
                : LandingPageConfig::defaultConfig();

            $noticesConfig = $payload['notices'] ?? ['enabled' => true, 'maxItems' => 5];
            $notices = [];
            if (! empty($noticesConfig['enabled'])) {
                $max = (int) ($noticesConfig['maxItems'] ?? 5);
                $notices = Notice::where('institution_id', $institutionId)
                    ->where('is_published', true)
                    ->orderByDesc('published_at')
                    ->limit($max)
                    ->get(['id', 'title', 'title_bn', 'body', 'body_bn', 'published_at']);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'institution_id' => $institutionId,
                    'config' => $payload,
                    'notices' => $notices,
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'success' => true,
                'data' => [
                    'institution_id' => 1,
                    'config' => LandingPageConfig::defaultConfig(),
                    'notices' => [],
                ],
            ], 200);
        }
    }

    /**
     * Admin: get current config for editing. Always merged with defaults.
     */
    public function getConfig(): JsonResponse
    {
        $institutionId = $this->institutionId();
        $row = LandingPageConfig::where('institution_id', $institutionId)->first();

        $payload = $row
            ? LandingPageConfig::mergeWithDefaults($row->config)
            : LandingPageConfig::defaultConfig();

        return response()->json(['success' => true, 'data' => $payload]);
    }

    /**
     * Admin: update landing page config. Deep merge with existing so partial updates don't lose sections.
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'config' => 'required|array',
            'config.site' => 'nullable|array',
            'config.site.logoUrl' => 'nullable|string|max:500',
            'config.site.schoolName' => 'nullable|string|max:255',
            'config.site.schoolName_bn' => 'nullable|string|max:255',
            'config.site.bannerImageUrl' => 'nullable|string|max:500',
            'config.header' => 'nullable|array',
            'config.header.topBarEnabled' => 'nullable|boolean',
            'config.header.topBarLeft' => 'nullable|string|max:255',
            'config.header.topBarLeft_bn' => 'nullable|string|max:255',
            'config.header.topBarRight' => 'nullable|string|max:255',
            'config.header.topBarRight_bn' => 'nullable|string|max:255',
            'config.nav' => 'nullable|array',
            'config.nav.links' => 'nullable|array',
            'config.nav.links.*.label' => 'nullable|string|max:100',
            'config.nav.links.*.label_bn' => 'nullable|string|max:100',
            'config.nav.links.*.href' => 'nullable|string|max:255',
            'config.hero' => 'nullable|array',
            'config.about' => 'nullable|array',
            'config.academic' => 'nullable|array',
            'config.academic.enabled' => 'nullable|boolean',
            'config.academic.heading' => 'nullable|string|max:255',
            'config.academic.heading_bn' => 'nullable|string|max:255',
            'config.academic.body' => 'nullable|string',
            'config.academic.body_bn' => 'nullable|string',
            'config.academic.highlights' => 'nullable|array',
            'config.admission' => 'nullable|array',
            'config.admission.enabled' => 'nullable|boolean',
            'config.admission.heading' => 'nullable|string|max:255',
            'config.admission.heading_bn' => 'nullable|string|max:255',
            'config.admission.body' => 'nullable|string',
            'config.admission.body_bn' => 'nullable|string',
            'config.admission.requirements' => 'nullable|string',
            'config.admission.requirements_bn' => 'nullable|string',
            'config.admission.contactInfo' => 'nullable|string',
            'config.admission.contactInfo_bn' => 'nullable|string',
            'config.features' => 'nullable|array',
            'config.features.*.title' => 'nullable|string|max:255',
            'config.features.*.title_bn' => 'nullable|string|max:255',
            'config.features.*.description' => 'nullable|string',
            'config.features.*.icon' => 'nullable|string|max:50',
            'config.contact' => 'nullable|array',
            'config.footer' => 'nullable|array',
            'config.footer.aboutTitle' => 'nullable|string|max:255',
            'config.footer.aboutTitle_bn' => 'nullable|string|max:255',
            'config.footer.aboutText' => 'nullable|string',
            'config.footer.aboutText_bn' => 'nullable|string',
            'config.footer.linksTitle' => 'nullable|string|max:255',
            'config.footer.linksTitle_bn' => 'nullable|string|max:255',
            'config.footer.quickLinks' => 'nullable|array',
            'config.footer.quickLinks.*.label' => 'nullable|string|max:100',
            'config.footer.quickLinks.*.label_bn' => 'nullable|string|max:100',
            'config.footer.quickLinks.*.href' => 'nullable|string|max:255',
            'config.footer.contactTitle' => 'nullable|string|max:255',
            'config.footer.contactTitle_bn' => 'nullable|string|max:255',
            'config.seo' => 'nullable|array',
            'config.notices' => 'nullable|array',
            'config.heroSlides' => 'nullable|array',
            'config.heroSlides.enabled' => 'nullable|boolean',
            'config.heroSlides.autoPlayInterval' => 'nullable|integer|min:1000|max:30000',
            'config.heroSlides.slides' => 'nullable|array|max:10',
            'config.heroSlides.slides.*.imageUrl' => 'nullable|string|max:500',
            'config.heroSlides.slides.*.title' => 'nullable|string|max:255',
            'config.heroSlides.slides.*.title_bn' => 'nullable|string|max:255',
            'config.heroSlides.slides.*.subtitle' => 'nullable|string|max:500',
            'config.heroSlides.slides.*.subtitle_bn' => 'nullable|string|max:500',
            'config.heroSlides.slides.*.overlayOpacity' => 'nullable|integer|min:0|max:100',
            'config.stats' => 'nullable|array',
            'config.stats.enabled' => 'nullable|boolean',
            'config.stats.items' => 'nullable|array|max:8',
            'config.stats.items.*.icon' => 'nullable|string|max:50',
            'config.stats.items.*.value' => 'nullable|integer|min:0',
            'config.stats.items.*.suffix' => 'nullable|string|max:10',
            'config.stats.items.*.label' => 'nullable|string|max:100',
            'config.stats.items.*.label_bn' => 'nullable|string|max:100',
            'config.gallery' => 'nullable|array',
            'config.gallery.enabled' => 'nullable|boolean',
            'config.gallery.heading' => 'nullable|string|max:255',
            'config.gallery.heading_bn' => 'nullable|string|max:255',
            'config.gallery.subtitle' => 'nullable|string|max:500',
            'config.gallery.subtitle_bn' => 'nullable|string|max:500',
            'config.gallery.images' => 'nullable|array|max:20',
            'config.gallery.images.*.url' => 'nullable|string|max:500',
            'config.gallery.images.*.caption' => 'nullable|string|max:255',
            'config.gallery.images.*.caption_bn' => 'nullable|string|max:255',
            'config.testimonials' => 'nullable|array',
            'config.testimonials.enabled' => 'nullable|boolean',
            'config.testimonials.heading' => 'nullable|string|max:255',
            'config.testimonials.heading_bn' => 'nullable|string|max:255',
            'config.testimonials.items' => 'nullable|array|max:10',
            'config.testimonials.items.*.name' => 'nullable|string|max:100',
            'config.testimonials.items.*.name_bn' => 'nullable|string|max:100',
            'config.testimonials.items.*.role' => 'nullable|string|max:100',
            'config.testimonials.items.*.role_bn' => 'nullable|string|max:100',
            'config.testimonials.items.*.text' => 'nullable|string|max:1000',
            'config.testimonials.items.*.text_bn' => 'nullable|string|max:1000',
            'config.testimonials.items.*.imageUrl' => 'nullable|string|max:500',
            'config.testimonials.items.*.rating' => 'nullable|integer|min:1|max:5',
            'config.aboutGallery' => 'nullable|array',
            'config.aboutGallery.enabled' => 'nullable|boolean',
            'config.aboutGallery.images' => 'nullable|array|max:10',
        ]);

        $institutionId = $this->institutionId();
        $row = LandingPageConfig::firstOrNew(['institution_id' => $institutionId]);
        $existing = $row->exists ? $row->config : [];
        $merged = LandingPageConfig::mergeWithDefaults($existing);
        $merged = LandingPageConfig::deepMerge($merged, $request->input('config', []));

        $row->institution_id = $institutionId;
        $row->config = $merged;
        $row->save();

        return response()->json([
            'success' => true,
            'data' => LandingPageConfig::mergeWithDefaults($row->config),
            'message' => 'Landing page updated. Changes are live on the website.',
        ]);
    }

    /**
     * Admin: upload landing page image. Returns URL for config.
     * type: logo, banner, hero, about
     */
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'type' => 'required|in:logo,banner,hero,about,slide,gallery,testimonial',
            'file' => 'required|image|mimes:jpeg,png,gif,webp|max:5120',
        ]);

        $file = $request->file('file');
        $type = $request->input('type');
        // Use guessExtension() which derives extension from detected MIME type, not the user-supplied filename
        $ext = $file->guessExtension() ?: 'jpg';
        $name = $type . '_' . Str::random(12) . '.' . strtolower($ext);

        $path = 'landing';
        $dir = public_path($path);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $file->move($dir, $name);
        $url = asset($path . '/' . $name);

        return response()->json([
            'success' => true,
            'data' => ['url' => $url],
            'message' => 'Image uploaded.',
        ]);
    }

    /**
     * Public: submit contact form. Sends email to school's contact address.
     */
    public function submitContact(Request $request): JsonResponse
    {
        $request->validate([
            'institution_id' => 'nullable|integer|min:1',
            'name' => 'required|string|max:255',
            'email' => 'required|email',
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:5000',
        ]);

        $institutionId = (int) ($request->input('institution_id', 1));
        $institution = Institution::find($institutionId);

        if (! $institution || ! $institution->is_active) {
            return response()->json(['success' => false, 'message' => 'School not found or inactive.'], 404);
        }

        $config = LandingPageConfig::where('institution_id', $institutionId)->first();
        $contactConfig = $config ? ($config->config['contact'] ?? []) : [];
        $toEmail = $contactConfig['email'] ?? $institution->email;

        if (empty($toEmail) || ! filter_var($toEmail, FILTER_VALIDATE_EMAIL)) {
            return response()->json([
                'success' => false,
                'message' => 'This school has not configured a contact email. Please try again later.',
            ], 422);
        }

        $schoolName = $config ? ($config->config['site']['schoolName'] ?? $institution->name) : $institution->name;

        try {
            Mail::to($toEmail)->send(new ContactFormMail(
                $request->input('name'),
                $request->input('email'),
                $request->input('subject'),
                $request->input('message'),
                $schoolName
            ));
        } catch (\Throwable $e) {
            \Log::error('Contact form send failed', ['error' => $e->getMessage(), 'to' => $toEmail]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to send message. Please try again or contact the school directly.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Your message has been sent. The school will respond to your email.',
        ]);
    }
}
