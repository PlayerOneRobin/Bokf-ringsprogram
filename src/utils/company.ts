const STORAGE_KEY = "bokforing.activeCompanyId";

export const getActiveCompanyId = () => {
  return localStorage.getItem(STORAGE_KEY);
};

export const setActiveCompanyId = (companyId: string) => {
  localStorage.setItem(STORAGE_KEY, companyId);
};
