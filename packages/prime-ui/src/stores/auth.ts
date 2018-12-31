import { types, flow } from 'mobx-state-tree';
import { User } from './models/User';
import { fields } from '../utils/fields';
import { Settings } from './settings';

export const Auth = types
  .model('Auth', {
    user: types.maybeNull(User),
    isSetup: types.optional(types.maybeNull(types.boolean), null),
    isLoggedIn: false,
  })
  .actions(self => {

    const ensureFields = async () => {
      if (!self.isLoggedIn) return;
      await Settings.read();
      Settings.fields.forEach((field: any) => {
        if (field.ui && !fields[field.id]) {
          const script = document.createElement('script');
          script.src = `${Settings.coreUrl}/fields/${field.id}/index.js`;
          script.id = `Prime_Field_${field.id}`;
          document.body.appendChild(script);
        }
      });
    };

    const login = flow(function*(email: string, password: string) {
      const res: any = yield fetch(`${Settings.coreUrl}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      }).then(res => res.json());

      self.isLoggedIn = Boolean(res.user);
      self.user = res.user;

      yield ensureFields();

      return res;
    });

    const logout = flow(function*() {
      yield fetch(`${Settings.coreUrl}/auth/logout`, {
        credentials: 'include',
      });
      self.isLoggedIn = false;
      self.user = null;
    });

    const checkLogin = flow(function*() {
      const res: any = yield fetch(`${Settings.coreUrl}/auth/user`, {
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
      }).then(res => res.json());

      if (res.setup) {
        self.isSetup = res.setup;
      } else if (res.user) {
        self.isLoggedIn = Boolean(res.user);
        self.user = res.user;
      }

      yield ensureFields();
    });

    const register = flow(function*({ firstname = '', lastname = '', email, password }: { firstname?: string, lastname?: string, email: string, password: string }) {
      const res: any = yield fetch(`${Settings.coreUrl}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({ firstname, lastname, email, password }),
      }).then(res => res.json());

      self.isSetup = false;
      self.isLoggedIn = Boolean(res.user);
      self.user = res.user;

      yield ensureFields();

      return res;
    });

    return {
      login,
      logout,
      register,
      checkLogin,
    };
  })
  .create();
