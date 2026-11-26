'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Organization, Profile, ProfileRole } from '@/types';
import { hydrateOrganizationSaas } from '@/lib/saas-storage-client';

export function useUser() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setAuthUser(user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const typedProfile = (profileData as Profile | null) ?? null;
        setProfile(typedProfile);

        if (typedProfile?.organization_id) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', typedProfile.organization_id)
            .single();
          setOrganization(hydrateOrganizationSaas((orgData as Organization | null) ?? null));
        } else {
          setOrganization(null);
        }
      } else {
        setAuthUser(null);
        setProfile(null);
        setOrganization(null);
      }
      setLoading(false);
    };

    fetchProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchProfile();
    });

    const handleOrgUpdated = () => {
      fetchProfile();
    };
    window.addEventListener('figura:org-updated', handleOrgUpdated);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('figura:org-updated', handleOrgUpdated);
    };
  }, [supabase]);

  const isSuperAdmin = Boolean(profile?.is_super_admin);
  const isDemo = Boolean(organization?.is_demo);
  const role: ProfileRole = profile?.role || 'member';
  const isOwner = role === 'owner' || isSuperAdmin;
  const isAdmin = role === 'owner' || role === 'admin' || isSuperAdmin;

  return {
    profile,
    organization,
    authUser,
    loading,
    role,
    isOwner,
    isAdmin,
    isSuperAdmin,
    isDemo,
  };
}
