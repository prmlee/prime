import { types, flow, Instance } from 'mobx-state-tree';
import { client } from '../utils/client';
import { ContentType } from './models/ContentType';
import { CONTENT_TYPE_BY_ID, ALL_CONTENT_TYPES } from './queries';
import { CREATE_CONTENT_TYPE } from './mutations';
import { when } from 'mobx';

export const ContentTypes = types.model('ContentTypes', {
  items: types.map(types.late(() => ContentType)),
  loading: false,
  loaded: false,
  error: false,
})
.views(self => ({
  get list() {
    const entries = Array.from(self.items.values());
    entries.sort((a, b) => a.title.localeCompare(b.title));
    return entries;
  },
}))
.actions(self => {

  const getByName = (name: string) => {
    const lowerCaseName = name.toLocaleLowerCase();
    return self.list.find(contentType => contentType.name.toLocaleLowerCase() === lowerCaseName);
  }

  const loadById = flow(function* loadById(id: string){
    let item;
    const { data } = yield client.query({
      query: CONTENT_TYPE_BY_ID,
      variables: { id },
      fetchPolicy: 'network-only',
    });
    if (data.ContentType) {
      item = ContentType.create(data.ContentType);
      if (self.items.has(id)) {
        item = self.items.get(id);
        if (item) {
          item.replace(data.ContentType);
        }
      } else {
        self.items.put(item);
      }
    }
    return item;
  });

  const loadAll = flow(function*(){
    if (self.loading) {
      yield new Promise(resolve => {
        when(() => self.loading === true, resolve);
      });
      return;
    }
    self.loading = true;

    try {
      const { data } = yield client.query({
        query: ALL_CONTENT_TYPES
      });
      data.allContentTypes.forEach((contentType: any) => {
        const item = ContentType.create(contentType);
        const prevItem = self.items.get(item.id);
        if (prevItem) {
          prevItem.replace(contentType);
        } else {
          self.items.put(item);
        }
      });
      self.loaded = true;
    } catch (err) {
      self.error = true;
    }

    self.loading = false;
  });

  const create = flow(function*(input: any) {
    try {
      const { data } = yield client.mutate({
        mutation: CREATE_CONTENT_TYPE,
        variables: { input }
      });
      if (data.createContentType) {
        const item = ContentType.create(data.createContentType);
        return self.items.put(item);
      }
    } catch (err) {
      throw new Error(err);
    }
  });

  const removeById = (id: string) => {
    self.items.delete(id);
  };

  return {
    getByName,
    loadAll,
    loadById,
    create,
    removeById,
  };
})
.create();

export const ContentTypeRef = types.reference(ContentType, {
  get(identifier: string) {
    return ContentTypes.items.get(identifier);
  },
  set(value: Instance<typeof ContentType>) {
    return value.id;
  },
} as any);
