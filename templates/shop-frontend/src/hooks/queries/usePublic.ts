import { useQuery, useMutation } from "@tanstack/react-query";
import { get, post } from "@/lib/api";

export interface PublicSettings {
  contact_email?: string;
  contact_phone?: string;
  contact_hero_title?: string;
  contact_hero_description?: string;
  location_description?: string;
  camp_name?: string;
  camp_tagline?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_image_url?: string;
  heritage_title?: string;
  heritage_description?: string;
  features_config?: string;
  gallery_teaser_title?: string;
  gallery_teaser_description?: string;
  gallery_cta_title?: string;
  gallery_cta_description?: string;
  cta_title?: string;
  cta_description?: string;
  cta_image_url?: string;
  location_title?: string;
  map_embed_url?: string;
  instagram_url?: string;
  facebook_url?: string;
}

export interface InquirySubmission {
  guest_name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

/**
 * Hook to fetch public settings (contact info, branding)
 */
export function usePublicSettings() {
  return useQuery({
    queryKey: ["public-settings"],
    queryFn: async () => {
      const response = await get<PublicSettings>("/public/settings");
      return response;
    },
    staleTime: 1000 * 60 * 30, // 30 mins
  });
}

/**
 * Mutation to submit a public inquiry
 */
export function useSubmitInquiry() {
  return useMutation({
    mutationFn: async (data: InquirySubmission) => {
      const response = await post<{ success: boolean; message: string }>("/public/inquiry", data);
      return response;
    },
  });
}
