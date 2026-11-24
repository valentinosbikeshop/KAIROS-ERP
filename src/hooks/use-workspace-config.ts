'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from './use-user';
import {
  DEFAULT_ADDONS,
  DEFAULT_PLANS,
  isDuoProducciones,
  resolveOrgEntitlements,
} from '@/lib/entitlements';
import {
  getIndustryBlueprint,
  THEME_PRESETS,
  type IndustryTerminology,
} from '@/lib/industries';
import type { SubscriptionAddon, SubscriptionPlan } from '@/types/database';

let cachedPlans: SubscriptionPlan[] | null = null;
let cachedAddons: SubscriptionAddon[] | null = null;

export function useWorkspaceConfig() {
  const { organization, isAdmin, isSuperAdmin, isDemo, loading } = useUser();
  const [plans, setPlans] = useState<SubscriptionPlan[]>(cachedPlans || DEFAULT_PLANS);
  const [addons, setAddons] = useState<SubscriptionAddon[]>(cachedAddons || DEFAULT_ADDONS);
  const [khipuReady, setKhipuReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/plans')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data?.plans) && data.plans.length > 0) {
          cachedPlans = data.plans;
          setPlans(data.plans);
        }
        if (Array.isArray(data?.addons) && data.addons.length > 0) {
          cachedAddons = data.addons;
          setAddons(data.addons);
        }
        setKhipuReady(Boolean(data?.khipuReady));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const isDuoExempt = useMemo(() => isDuoProducciones(organization), [organization]);

  const entitlements = useMemo(
    () => resolveOrgEntitlements(organization, plans, addons),
    [organization, plans, addons]
  );

  const industry = useMemo(
    () => getIndustryBlueprint(entitlements.industryType),
    [entitlements.industryType]
  );

  const terms: IndustryTerminology = useMemo(() => {
    // DUO Producciones conserva su terminología original intacta
    if (isDuoExempt) {
      return getIndustryBlueprint('eventos_banqueteria').terminology;
    }
    const custom = organization?.custom_terminology || {};
    return {
      ...industry.terminology,
      ...(custom.projectSingular ? { projectSingular: custom.projectSingular, newProjectCta: `Nuevo ${custom.projectSingular}` } : {}),
      ...(custom.projectPlural ? { projectPlural: custom.projectPlural } : {}),
      ...(custom.clientLabel ? { clientLabel: custom.clientLabel } : {}),
      ...(custom.catalogLabel ? { catalogLabel: custom.catalogLabel } : {}),
      ...(custom.locationLabel ? { locationLabel: custom.locationLabel } : {}),
    };
  }, [industry, organization?.custom_terminology, isDuoExempt]);

  const theme = useMemo(
    () => THEME_PRESETS[entitlements.themePreset] || THEME_PRESETS.obsidian_gold,
    [entitlements.themePreset]
  );

  return {
    loading,
    organization,
    isAdmin,
    isSuperAdmin,
    isDemo,
    isDuoExempt,
    entitlements,
    industry,
    terms,
    theme,
    plans,
    addons,
    khipuReady,
  };
}
