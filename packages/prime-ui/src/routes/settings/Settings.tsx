import React from 'react';
import { Layout, Card, Menu } from 'antd';
import { Route, Switch, NavLink } from 'react-router-dom';
import { Redirect } from 'react-router';
import { Toolbar } from '../../components/toolbar/Toolbar';
import { Account } from './Account';
import { Users } from './Users';
import { Security } from './Security';
import { Previews } from './Previews';
import { Locales } from './Locales';
import { Releases } from './Releases';
import { Webhooks } from './Webhooks';
import { WebhookCalls } from './WebhookCalls';
import './Settings.less';

const nav = [{
  key: 'account',
  title: 'Account',
  component: Account,
}, {
  key: 'users',
  title: 'Users',
  component: Users,
}, {
  key: 'security',
  title: 'Security',
  component: Security,
}, {
  key: 'webhooks',
  title: 'Webhooks',
  component: Webhooks,
}, {
  key: 'releases',
  title: 'Releases',
  component: Releases,
}, {
  key: 'previews',
  title: 'Previews',
  component: Previews,
}, {
  key: 'locales',
  title: 'Locales',
  component: Locales,
}]

export const Settings = (props: any) => {
  const { path } = props.match;
  const { pathname } = props.location;
  const [key] = pathname.replace(new RegExp(`^${path}/?`), '').split('/') || ['account'];

  return (
    <Layout className="prime__settings">
      <Toolbar>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>Settings</h2>
        </div>
      </Toolbar>
      <Layout.Content className="prime__settings__content">
        <Card bordered={false} className="prime__settings__card">
          <div className="prime__settings__left">
            <Menu
              mode="inline"
              selectedKeys={[key]}
              className="prime__settings__menu"
            >
              {nav.map(({ key, title }) => (
                <Menu.Item key={key}>
                  <NavLink to={`${path}/${key}`} className="nav-text">{title}</NavLink>
                </Menu.Item>
              ))}
            </Menu>
          </div>
          <div className="prime__settings__right">
            <Switch>
              <Route exact path={`${path}/webhooks/:webhookId`} component={WebhookCalls} />
              {nav.map(({ key, component }) => (
                <Route path={`${path}/${key}`} component={component} key={key} />
              ))}
              <Redirect to={`${path}/account`} />
            </Switch>
          </div>
        </Card>
      </Layout.Content>
    </Layout>
  );
}
