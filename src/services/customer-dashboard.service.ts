import type { NurseryPublicProfile } from "../types/public-profile.types";
import type { BannerItem } from "./banner.service";
import { BannerService } from "./banner.service";
import { GerminationService } from "./germination.service";
import { NurseryPublicProfileService } from "./nursery-public-profile.service";
import { PaymentService } from "./payment.service";
import { SowingService } from "./sowing.service";

export interface CustomerLifecycleSummary {
  sown: number;
  germinated: number;
  discarded: number;
  pending: number;
}

const toNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const normalizePhone = (value?: string) => (value || "").replace(/[^\d]/g, "");

const matchCustomer = (
  row: any,
  user?: { id?: string; phoneNumber?: string; role?: string; nurseryId?: string },
) => {
  if (user?.role === "CUSTOMER") {
    // Backend customer APIs already scope by authenticated customer user.
    return true;
  }
  if (!user?.id && !user?.phoneNumber) return true;
  const userId = String(user?.id || "");
  const userPhone = normalizePhone(user?.phoneNumber);
  const candidates = [
    row?.customerId,
    row?.customer?._id,
    row?.customer?.id,
    row?.customerPhone,
    row?.customer?.phone,
    row?.customer?.phoneNumber,
    row?.phoneNumber,
    row?.mobileNumber,
    row?.sowingId?.customerId,
    row?.sowingId?.customer?._id,
    row?.sowingId?.customerPhone,
  ];

  const candidateIds = candidates.map((v) => String(v || ""));
  if (userId && candidateIds.includes(userId)) return true;

  const phoneValues = candidates.map((v) => normalizePhone(typeof v === "string" ? v : ""));
  if (userPhone && phoneValues.includes(userPhone)) return true;

  return false;
};

const getSownQuantity = (item: any) =>
  toNumber(
    item?.quantity ??
      item?.totalSeeds ??
      item?.seedsSown ??
      item?.quantitySown ??
      item?.seedQuantity ??
      item?.sownQuantity,
  );

const getGerminatedQuantity = (item: any) =>
  toNumber(item?.germinatedSeeds ?? item?.germinated ?? item?.totalGerminated);

const getDiscardedQuantity = (item: any) =>
  toNumber(item?.discardedSeeds ?? item?.discarded ?? item?.totalDiscarded);

export interface CustomerDashboardOverview {
  dueSummary: {
    total: number;
    paid: number;
    due: number;
    partialCount: number;
    pendingVerification: number;
  };
  dues: any[];
  lifecycle: CustomerLifecycleSummary;
  banners: BannerItem[];
  nurseryPublicProfile: NurseryPublicProfile;
}

export const CustomerDashboardService = {
  async getOverview(user?: {
    id?: string;
    phoneNumber?: string;
    role?: string;
    nurseryId?: string;
  }): Promise<CustomerDashboardOverview> {
    const [
      dueSummary,
      dues,
      sowing,
      germination,
      banners,
      nurseryPublicProfile,
    ] = await Promise.all([
      PaymentService.getCustomerDueOverview(user).catch(() => ({
        total: 0,
        paid: 0,
        due: 0,
        partialCount: 0,
        pendingVerification: 0,
      })),
      PaymentService.getDueSalesForUser(user).catch(() => []),
      SowingService.getAll({
        nurseryId: user?.nurseryId,
        customerId: user?.id,
        customerPhone: user?.phoneNumber,
      }).catch(() => []),
      GerminationService.getAll({
        nurseryId: user?.nurseryId,
        customerId: user?.id,
        customerPhone: user?.phoneNumber,
      }).catch(() => []),
      BannerService.listCustomerBanners().catch(() => []),
      NurseryPublicProfileService.get(user?.nurseryId).catch(
        () =>
          ({
            nurseryId: user?.nurseryId || "default_nursery",
            updatedAt: new Date().toISOString(),
          }) as NurseryPublicProfile,
      ),
    ]);

    const sowingRows = (Array.isArray(sowing) ? sowing : []).filter((item: any) =>
      matchCustomer(item, user),
    );
    const germinationRows = (Array.isArray(germination) ? germination : []).filter((item: any) =>
      matchCustomer(item, user),
    );

    const sownFromSowing = sowingRows.reduce(
      (sum, item: any) => sum + getSownQuantity(item),
      0,
    );
    const sownFromGerminationSource = germinationRows.reduce(
      (sum, item: any) => {
        const source = item?.sowingId || item?.sowing || {};
        return sum + getSownQuantity(source);
      },
      0,
    );

    const lifecycle: CustomerLifecycleSummary = {
      sown: Math.max(sownFromSowing, sownFromGerminationSource),
      germinated: germinationRows.reduce(
        (sum, item: any) => sum + getGerminatedQuantity(item),
        0,
      ),
      discarded: germinationRows.reduce(
        (sum, item: any) => sum + getDiscardedQuantity(item),
        0,
      ),
      pending: 0,
    };
    lifecycle.pending = Math.max(
      lifecycle.sown - lifecycle.germinated - lifecycle.discarded,
      0,
    );

    const normalizedDueSummary = {
      total: toNumber((dueSummary as any)?.total),
      paid: toNumber((dueSummary as any)?.paid),
      due: toNumber((dueSummary as any)?.due),
      partialCount: toNumber((dueSummary as any)?.partialCount),
      pendingVerification: toNumber((dueSummary as any)?.pendingVerification),
    };

    // make sure the banners array is always an actual banner list
    // (BannerService already returns normalized items but we add a small
    // safeguard here in case something upstream mutates the data).
    const normalizedBanners: BannerItem[] = Array.isArray(banners)
      ? banners.map((b: BannerItem) => ({ ...b }))
      : [];

    return {
      dueSummary: normalizedDueSummary,
      dues,
      lifecycle,
      banners: normalizedBanners,
      nurseryPublicProfile,
    };
  },
};
