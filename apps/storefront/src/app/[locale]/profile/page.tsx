"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/shared/toast";
import { queryKeys } from "@/lib/query-keys";
import { fetchProfile, updateProfile } from "@/lib/api/profile";

const GENDER_OPTIONS = ["male", "female", "prefer_not_to_say"] as const;

const GENDER_TRANSLATION_MAP: Record<string, string> = {
  male: "male",
  female: "female",
  prefer_not_to_say: "preferNotToSay",
};

export default function ProfilePage() {
  const t = useTranslations("profile.settings");
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: profileRes, isLoading } = useQuery({
    queryKey: queryKeys.profile.me(),
    queryFn: fetchProfile,
  });

  const profile = profileRes?.data ?? null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName ?? "");
      setLastName(profile.lastName ?? "");
      setDateOfBirth(
        profile.dateOfBirth ? (profile.dateOfBirth.split("T")[0] ?? "") : ""
      );
      setGender(profile.gender ?? "");
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
      showToast({ message: t("profileUpdated"), variant: "success" });
    },
    onError: () => {
      showToast({ message: t("title"), variant: "error" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      firstName,
      lastName,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-muted rounded animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-24 bg-surface-muted rounded animate-pulse" />
            <div className="h-12 w-full bg-surface-muted rounded-pill animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-heading text-heading-lg font-bold text-primary mb-6">
        {t("personalInfo")}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
        {/* First Name & Last Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-body-sm font-medium text-primary mb-1.5">
              {t("firstName")}
            </label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-body-sm font-medium text-primary mb-1.5">
              {t("lastName")}
            </label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-body-sm font-medium text-primary mb-1.5">
            {t("email")}
          </label>
          <Input value={profile?.email ?? ""} disabled />
        </div>

        {/* Phone (read-only, shown only if present) */}
        {profile?.phone && (
          <div>
            <label className="block text-body-sm font-medium text-primary mb-1.5">
              {t("phone")}
            </label>
            <Input value={profile.phone} disabled />
          </div>
        )}

        {/* Date of Birth */}
        <div>
          <label className="block text-body-sm font-medium text-primary mb-1.5">
            {t("dateOfBirth")}
          </label>
          <Input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-body-sm font-medium text-primary mb-2">
            {t("gender")}
          </label>
          <div className="flex gap-4 flex-wrap">
            {GENDER_OPTIONS.map((option) => (
              <label
                key={option}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="gender"
                  value={option}
                  checked={gender === option}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-body-md text-primary">
                  {t(GENDER_TRANSLATION_MAP[option] ?? option)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "..." : t("updateProfile")}
          </Button>
        </div>
      </form>
    </div>
  );
}
