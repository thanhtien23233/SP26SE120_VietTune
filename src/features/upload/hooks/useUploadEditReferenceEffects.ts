import { useEffect } from 'react';

import { PROVINCE_REGION_CODE_TO_NAME as REGION_CODE_TO_NAME } from '@/config/provinceRegionCodes';

type IdName = { id: string; name: string };
type CommuneRow = { id: string; name: string; districtId: string };
type DistrictRow = { id: string; name: string; provinceId: string };
type ProvinceRow = { id: string; name: string; regionCode: string };

/** Maps saved UUIDs to display names once reference data is loaded (edit mode). */
export function useUploadEditReferenceEffects(params: {
  isEditMode: boolean;
  initialEthnicGroupId: string | null;
  ethnicGroupsData: IdName[];
  ethnicity: string;
  setEthnicity: (v: string) => void;
  initialCeremonyId: string | null;
  ceremoniesData: IdName[];
  eventType: string;
  setEventType: (v: string) => void;
  initialVocalStyleId: string | null;
  vocalStylesData: IdName[];
  vocalStyle: string;
  setVocalStyle: (v: string) => void;
  initialMusicalScaleId: string | null;
  musicalScalesData: IdName[];
  musicalScale: string;
  setMusicalScale: (v: string) => void;
  initialInstrumentIds: string[];
  instrumentsData: IdName[];
  instruments: string[];
  setInstruments: (v: string[]) => void;
}) {
  const {
    isEditMode,
    initialEthnicGroupId,
    ethnicGroupsData,
    ethnicity,
    setEthnicity,
    initialCeremonyId,
    ceremoniesData,
    eventType,
    setEventType,
    initialVocalStyleId,
    vocalStylesData,
    vocalStyle,
    setVocalStyle,
    initialMusicalScaleId,
    musicalScalesData,
    musicalScale,
    setMusicalScale,
    initialInstrumentIds,
    instrumentsData,
    instruments,
    setInstruments,
  } = params;

  useEffect(() => {
    if (isEditMode && initialEthnicGroupId && ethnicGroupsData.length > 0 && !ethnicity) {
      const match = ethnicGroupsData.find((e) => e.id === initialEthnicGroupId);
      if (match) setEthnicity(match.name);
    }
    if (isEditMode && initialCeremonyId && ceremoniesData.length > 0 && !eventType) {
      const match = ceremoniesData.find((c) => c.id === initialCeremonyId);
      if (match) setEventType(match.name);
    }
    if (isEditMode && initialVocalStyleId && vocalStylesData.length > 0 && !vocalStyle) {
      const match = vocalStylesData.find((v) => v.id === initialVocalStyleId);
      if (match) setVocalStyle(match.name);
    }
    if (isEditMode && initialMusicalScaleId && musicalScalesData.length > 0 && !musicalScale) {
      const match = musicalScalesData.find((m) => m.id === initialMusicalScaleId);
      if (match) setMusicalScale(match.name);
    }
    if (
      isEditMode &&
      initialInstrumentIds.length > 0 &&
      instrumentsData.length > 0 &&
      instruments.length === 0
    ) {
      const names = initialInstrumentIds
        .map((id) => instrumentsData.find((i) => i.id === id)?.name)
        .filter((name): name is string => !!name);
      if (names.length > 0) setInstruments(names);
    }
  }, [
    isEditMode,
    initialEthnicGroupId,
    ethnicGroupsData,
    initialCeremonyId,
    ceremoniesData,
    initialVocalStyleId,
    vocalStylesData,
    initialMusicalScaleId,
    musicalScalesData,
    initialInstrumentIds,
    instrumentsData,
    ethnicity,
    eventType,
    vocalStyle,
    musicalScale,
    instruments,
    setEthnicity,
    setEventType,
    setVocalStyle,
    setMusicalScale,
    setInstruments,
  ]);
}

/** Resolves commune → district → province → region once communes load (edit mode). */
export function useUploadEditCommuneProvinceEffect(params: {
  isEditMode: boolean;
  initialCommuneId: string | null;
  communesData: CommuneRow[];
  districtsData: DistrictRow[];
  provincesData: ProvinceRow[];
  commune: string;
  setCommune: (v: string) => void;
  setDistrict: (v: string) => void;
  setProvince: (v: string) => void;
  setRegion: (v: string) => void;
}) {
  const {
    isEditMode,
    initialCommuneId,
    communesData,
    districtsData,
    provincesData,
    commune,
    setCommune,
    setDistrict,
    setProvince,
    setRegion,
  } = params;

  useEffect(() => {
    if (isEditMode && initialCommuneId && communesData.length > 0 && !commune) {
      const commMatch = communesData.find((c) => c.id === initialCommuneId);
      if (commMatch) {
        setCommune(commMatch.name);
        const distMatch = districtsData.find((d) => d.id === commMatch.districtId);
        if (distMatch) {
          setDistrict(distMatch.name);
          const provMatch = provincesData.find((p) => p.id === distMatch.provinceId);
          if (provMatch) {
            setProvince(provMatch.name);
            setRegion(REGION_CODE_TO_NAME[provMatch.regionCode] || '');
          }
        }
      }
    }
  }, [
    isEditMode,
    initialCommuneId,
    communesData,
    districtsData,
    provincesData,
    commune,
    setCommune,
    setDistrict,
    setProvince,
    setRegion,
  ]);
}
