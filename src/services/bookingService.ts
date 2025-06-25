import { BookingLinkParams, BookingLinks } from '../types/booking';

export class BookingService {
  static generateHotelBookingLinks(params: BookingLinkParams): BookingLinks {
    const links: BookingLinks = {};

    links.booking = this.buildBookingUrl(params);
    links.rakuten = this.buildRakutenUrl(params);
    links.expedia = this.buildExpediaUrl(params);

    return links;
  }

  private static buildBookingUrl(params: BookingLinkParams): string {
    const sp = new URLSearchParams();
    sp.set('ss', params.name);
    if (params.checkIn) sp.set('checkin', this.formatDate(params.checkIn));
    if (params.checkOut) sp.set('checkout', this.formatDate(params.checkOut));
    sp.set('group_adults', String(params.adults ?? 2));
    sp.set('no_rooms', String(params.rooms ?? 1));
    if (params.latitude && params.longitude) {
      sp.set('latitude', String(params.latitude));
      sp.set('longitude', String(params.longitude));
    }
    return `https://www.booking.com/searchresults.ja.html?${sp.toString()}`;
  }

  private static buildRakutenUrl(params: BookingLinkParams): string {
    const sp = new URLSearchParams();
    sp.set('f_query', params.name);
    if (params.checkIn) sp.set('f_checkin', this.formatDate(params.checkIn, 'yyyyMMdd'));
    if (params.checkOut) sp.set('f_checkout', this.formatDate(params.checkOut, 'yyyyMMdd'));
    sp.set('f_adult_num', String(params.adults ?? 2));
    sp.set('f_room_num', String(params.rooms ?? 1));
    return `https://travel.rakuten.co.jp/search/result?${sp.toString()}`;
  }

  private static buildExpediaUrl(params: BookingLinkParams): string {
    const sp = new URLSearchParams();
    sp.set('destination', params.name);
    if (params.checkIn) sp.set('startDate', this.formatDate(params.checkIn));
    if (params.checkOut) sp.set('endDate', this.formatDate(params.checkOut));
    sp.set('rooms', String(params.rooms ?? 1));
    sp.set('adults', String(params.adults ?? 2));
    return `https://www.expedia.co.jp/Hotel-Search?${sp.toString()}`;
  }

  private static formatDate(date: Date, pattern: 'yyyy-MM-dd' | 'yyyyMMdd' = 'yyyy-MM-dd') {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return pattern === 'yyyyMMdd' ? `${y}${m}${d}` : `${y}-${m}-${d}`;
  }

  // レストラン予約リンク機能は削除
} 