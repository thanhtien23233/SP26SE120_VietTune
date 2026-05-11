import { useEffect, useState } from 'react';

import {
  macroRegionDisplayNameFromProvinceRegionCode as getRegionName,
} from '@/config/provinceRegionCodes';
import { reportError, toReportableError } from '@/services/errorReporting';
import {
  referenceDataService,
  type CeremonyItem,
  type CommuneItem,
  type DistrictItem,
  type EthnicGroupItem,
  type InstrumentItem,
  type MusicalScaleItem,
  type ProvinceItem,
  type VocalStyleItem,
} from '@/services/referenceDataService';

/**
 * Loads ethnic groups, ceremonies, instruments, provinces/regions, vocal styles, and musical scales.
 * Optionally prefetches full district/commune lists for edit mode. Keeps districts/communes in sync when province/district change.
 */
export function useUploadReferenceData(options: {
  isEditModeParam: boolean;
  recordingId?: string | null;
  province: string;
  district: string;
}) {
  const { isEditModeParam, recordingId, province, district } = options;

  const [ETHNICITIES, setETHNICITIES] = useState<string[]>([]);
  const [ethnicGroupsData, setEthnicGroupsData] = useState<EthnicGroupItem[]>([]);
  const [REGIONS, setREGIONS] = useState<string[]>([]);
  const [EVENT_TYPES, setEVENT_TYPES] = useState<string[]>([]);
  const [ceremoniesData, setCeremoniesData] = useState<CeremonyItem[]>([]);
  const [INSTRUMENTS, setINSTRUMENTS] = useState<string[]>([]);
  const [instrumentsData, setInstrumentsData] = useState<InstrumentItem[]>([]);

  const [provincesData, setProvincesData] = useState<ProvinceItem[]>([]);
  const [districtsData, setDistrictsData] = useState<DistrictItem[]>([]);
  const [communesData, setCommunesData] = useState<CommuneItem[]>([]);

  const [vocalStylesData, setVocalStylesData] = useState<VocalStyleItem[]>([]);
  const [musicalScalesData, setMusicalScalesData] = useState<MusicalScaleItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const ethnicGroups = await referenceDataService.getEthnicGroups();
        if (!cancelled && ethnicGroups.length > 0) {
          setEthnicGroupsData(ethnicGroups);
          setETHNICITIES(ethnicGroups.map((e) => e.name));
        }
      } catch (err) {
        reportError(toReportableError(err, 'Failed to load ethnic groups'), undefined, {
          region: 'upload',
          refData: 'ethnicGroups',
        });
      }

      try {
        const ceremonies = await referenceDataService.getCeremonies();
        if (!cancelled && ceremonies.length > 0) {
          setCeremoniesData(ceremonies);
          setEVENT_TYPES(ceremonies.map((c) => c.name));
        }
      } catch (err) {
        reportError(toReportableError(err, 'Failed to load ceremonies'), undefined, {
          region: 'upload',
          refData: 'ceremonies',
        });
      }

      try {
        const instrumentItems = await referenceDataService.getInstruments();
        if (!cancelled && instrumentItems.length > 0) {
          setInstrumentsData(instrumentItems);
          setINSTRUMENTS(Array.from(new Set(instrumentItems.map((i) => i.name))));
        }
      } catch (err) {
        reportError(toReportableError(err, 'Failed to load instruments'), undefined, {
          region: 'upload',
          refData: 'instruments',
        });
      }

      try {
        const prov = await referenceDataService.getProvinces();
        if (!cancelled) {
          setProvincesData(prov);
          const regionCodes = Array.from(new Set(prov.map((p) => p.regionCode).filter(Boolean)));
          setREGIONS(regionCodes.map((code) => getRegionName(code)).sort());
        }
      } catch (err) {
        reportError(toReportableError(err, 'Failed to load provinces'), undefined, {
          region: 'upload',
          refData: 'provinces',
        });
      }

      try {
        const [vs, ms] = await Promise.all([
          referenceDataService.getVocalStyles(),
          referenceDataService.getMusicalScales(),
        ]);
        if (!cancelled) {
          setVocalStylesData(vs);
          setMusicalScalesData(ms);
        }
      } catch (err) {
        reportError(toReportableError(err, 'Failed to load music style traits'), undefined, {
          region: 'upload',
          refData: 'vocalStylesMusicalScales',
        });
      }
    };
    
    void loadData();

    const handleRefDataUpdate = () => {
      void loadData();
    };

    window.addEventListener('viettune:refdata-updated', handleRefDataUpdate);

    return () => {
      cancelled = true;
      window.removeEventListener('viettune:refdata-updated', handleRefDataUpdate);
    };
  }, []);

  useEffect(() => {
    if (!isEditModeParam && !recordingId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [allDist, allComm] = await Promise.all([
          referenceDataService.getDistricts(),
          referenceDataService.getCommunes(),
        ]);
        if (!cancelled) {
          setDistrictsData(allDist);
          setCommunesData(allComm);
        }
      } catch (err) {
        reportError(toReportableError(err, 'Failed to load full admin hierarchy for edit mode'), undefined, {
          region: 'upload',
          refData: 'districtsCommunesPrefetch',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEditModeParam, recordingId]);

  useEffect(() => {
    let cancelled = false;
    if (!province) {
      setDistrictsData([]);
      return;
    }
    const provId = provincesData.find((p) => p.name === province)?.id;
    if (!provId) {
      setDistrictsData([]);
      return;
    }
    void (async () => {
      try {
        const dist = await referenceDataService.getDistrictsByProvince(provId);
        if (!cancelled) setDistrictsData(dist);
      } catch (err) {
        reportError(toReportableError(err, 'Failed to load districts'), undefined, {
          region: 'upload',
          refData: 'districtsByProvince',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [province, provincesData]);

  useEffect(() => {
    let cancelled = false;
    if (!district) {
      setCommunesData([]);
      return;
    }
    const distId = districtsData.find((d) => d.name === district)?.id;
    if (!distId) {
      setCommunesData([]);
      return;
    }
    void (async () => {
      try {
        const com = await referenceDataService.getCommunesByDistrict(distId);
        if (!cancelled) setCommunesData(com);
      } catch (err) {
        reportError(toReportableError(err, 'Failed to load communes'), undefined, {
          region: 'upload',
          refData: 'communesByDistrict',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [district, districtsData]);

  return {
    ETHNICITIES,
    setETHNICITIES,
    ethnicGroupsData,
    setEthnicGroupsData,
    REGIONS,
    setREGIONS,
    EVENT_TYPES,
    setEVENT_TYPES,
    ceremoniesData,
    setCeremoniesData,
    INSTRUMENTS,
    setINSTRUMENTS,
    instrumentsData,
    setInstrumentsData,
    provincesData,
    setProvincesData,
    districtsData,
    setDistrictsData,
    communesData,
    setCommunesData,
    vocalStylesData,
    setVocalStylesData,
    musicalScalesData,
    setMusicalScalesData,
  };
}
