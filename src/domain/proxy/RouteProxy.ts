import { type IRouteProvider } from "../model/IRouteProvider";
import { Route } from "../model/Route";
export class RouteProxy implements IRouteProvider {
  private cache = new Map<string, Route>();
  private realProvider: IRouteProvider;

  constructor(realProvider: IRouteProvider) {
    this.realProvider = realProvider;
  }

  private key(origin: string, dest: string, mob: string, type: string) {
    return `${origin}-${dest}-${mob}-${type}`;
  }

  async getRoute(origin: string, dest: string, mob: string, type: string): Promise<Route> {
    const k = this.key(origin, dest, mob, type);

    if (this.cache.has(k)) {
      return this.cache.get(k)!;
    }

    const route = await this.realProvider.getRoute(origin, dest, mob, type);
    this.cache.set(k, route);

    return route;
  }
}
