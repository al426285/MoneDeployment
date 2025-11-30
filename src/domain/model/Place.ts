export class Place {
  private _name!: string;
  private _latitude!: number;
  private _longitude!: number;
  private _toponymicAddress?: string;
  private _description?: string;

  constructor(name: string, latitude: number, longitude: number, toponymicAddress?: string, description?: string) {
    this.name = name;
    this.latitude = latitude;
    this.longitude = longitude;
    this.toponymicAddress = toponymicAddress;
    this.description = description;
  }

  get name(): string {
    return this._name;
  }
  set name(value: string) {
    if (!value || !value.trim()) throw new Error("Name cannot be empty.");
    this._name = value.trim();
  }

  get latitude(): number {
    return this._latitude;
  }
  set latitude(value: number) {
    if (!Number.isFinite(value) || value < -90 || value > 90) throw new Error("Latitude must be between -90 and 90.");
    this._latitude = value;
  }

  get longitude(): number {
    return this._longitude;
  }
  set longitude(value: number) {
    if (!Number.isFinite(value) || value < -180 || value > 180) throw new Error("Longitude must be between -180 and 180.");
    this._longitude = value;
  }

  get toponymicAddress(): string | undefined {
    return this._toponymicAddress;
  }
  set toponymicAddress(value: string | undefined) {
    this._toponymicAddress = value ? value.trim() : undefined;
  }

  get description(): string | undefined {
    return this._description;
  }

  set description(value: string | undefined) {
    this._description = value ? value.trim() : undefined;
  }

  toJSON() {
    return {
      name: this._name,
      latitude: this._latitude,
      longitude: this._longitude,
      toponymicAddress: this._toponymicAddress,
      description: this._description,
    };
  }
}