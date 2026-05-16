import React from "react";
import { PageBlock } from "@/types/api";
import { Input, Label, Select } from "@/components/ui";

import { Database, Layout, Mail } from "lucide-react";

interface FormSettingsProps {
  block: PageBlock;
  onChange: (updates: Partial<PageBlock>) => void;
}

const PREDEFINED_FUNCTIONS = [
  {
    id: "submit_contact",
    label: "Submit Contact",
    description: "Standard contact form submission",
    icon: <Mail size={14} />,
  },
  {
    id: "newsletter_signup",
    label: "Newsletter Signup",
    description: "Add user to marketing list",
    icon: <Mail size={14} />,
  },
  {
    id: "guest_feedback",
    label: "Guest Feedback",
    description: "Capture post-stay impressions",
    icon: <Layout size={14} />,
  },
];

const FormSettings: React.FC<FormSettingsProps> = ({ block, onChange }) => {
  const content = block.content;

  const handleChange = (key: string, value: any) => {
    onChange({ content: { ...content, [key]: value } });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-bold text-stone-600">Form Title</Label>
        <Input
          value={(content.title as string) || ""}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="e.g., Contact Us"
          className="bg-stone-50 border-stone-200"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-stone-600">Form Description</Label>
        <Input
          value={(content.description as string) || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="e.g., Send us a message and we'll get back to you..."
          className="bg-stone-50 border-stone-200"
        />
      </div>

      <div className="pt-4 border-t space-y-4">
        <div className="flex items-center gap-2 text-oasis font-bold text-[10px] uppercase tracking-widest">
          <Database size={12} />
          Backend Integration
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-stone-600">Function ID</Label>
          <Select
            value={(content.functionId as string) || ""}
            onChange={(e) => handleChange("functionId", e.target.value)}
            placeholder="Select a function..."
            options={PREDEFINED_FUNCTIONS.map((fn) => ({ value: fn.id, label: fn.label }))}
            className="bg-stone-50 border-stone-200"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-stone-600">Custom API Endpoint (Optional)</Label>
          <Input
            value={(content.apiEndpoint as string) || ""}
            onChange={(e) => handleChange("apiEndpoint", e.target.value)}
            placeholder="https://api.example.com/submit"
            className="bg-stone-50 border-stone-200"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-stone-600">HTTP Method</Label>
          <Select
            value={(content.method as string) || "POST"}
            onChange={(e) => handleChange("method", e.target.value)}
            options={[
              { value: "POST", label: "POST (Recommended)" },
              { value: "PUT", label: "PUT" },
              { value: "GET", label: "GET" },
            ]}
            className="bg-stone-50 border-stone-200"
          />
        </div>
      </div>

      <div className="pt-4 border-t space-y-4">
        <Label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
          Messages
        </Label>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-stone-600">Success Message</Label>
          <Input
            value={(content.successMessage as string) || ""}
            onChange={(e) => handleChange("successMessage", e.target.value)}
            placeholder="Thank you!"
            className="bg-stone-50 border-stone-200"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold text-stone-600">Submit Button Text</Label>
          <Input
            value={(content.submitLabel as string) || "Submit"}
            onChange={(e) => handleChange("submitLabel", e.target.value)}
            placeholder="e.g., Send Message"
            className="bg-stone-50 border-stone-200"
          />
        </div>
      </div>
    </div>
  );
};

export default FormSettings;
