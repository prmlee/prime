import * as React from 'react';
import { Drawer, Form, Input, Button, DatePicker } from 'antd';
import { FormComponentProps } from 'antd/lib/form';
import { Instance } from 'mobx-state-tree';
import { ContentRelease } from '../../stores/models/ContentRelease';
import { client } from '../../utils/client';
import { CREATE_CONTENT_RELEASE, UPDATE_CONTENT_RELEASE } from '../../stores/mutations';
import { ContentReleases } from '../../stores/contentReleases';
import moment from 'moment';

interface IProps extends FormComponentProps {
  isOpen: boolean;
  onClose(): void;
  item: null | undefined | Instance<typeof ContentRelease>;
}

export const ReleasesDrawer = Form.create()(({ form, isOpen, onClose, item }: IProps) => {

  React.useEffect(() => {
    form.resetFields();
  }, [isOpen])

  const onSubmit = async (e: React.FormEvent<HTMLElement>) => {
    e.preventDefault();

    form.validateFieldsAndScroll(async (errors, values) => {
      console.log(values);
      const res = await client.mutate({
        mutation: item ? UPDATE_CONTENT_RELEASE : CREATE_CONTENT_RELEASE,
        variables: {
          ...(item ? { id: item.id } : {}),
          name: values.name,
          description: values.description,
          scheduledAt: values.scheduledAt
        }
      });
      const data: any = res.data;
      if (data) {
        if (item && data.updateContentRelease) {
          item.update(data.updateContentRelease);
          onClose();
        } else if (!item && data.createContentRelease) {
          ContentReleases.add(ContentRelease.create(data.createContentRelease));
          onClose();
        }
      }
    });

    return false;
  };

  const isEditing = Boolean(item);

  return (
    <Drawer
      title={`${isEditing ? 'Edit' : 'Create'} Release`}
      width={360}
      placement="right"
      maskClosable={true}
      onClose={onClose}
      visible={isOpen}
      className="prime__drawer"
    >
      <Form onSubmit={onSubmit}>
        <Form.Item label="Name">
          {form.getFieldDecorator('name', {
            rules: [{ required: true }],
            initialValue: item ? item.name : ''
          })(
            <Input autoFocus={!isEditing} size="large" placeholder="eg. Feature X" />
          )}
        </Form.Item>
        <Form.Item label="Description">
          {form.getFieldDecorator('description', {
            initialValue: item ? item.description : ''
          })(
            <Input size="large" />
          )}
        </Form.Item>
        <Form.Item label="Publish at">
          {form.getFieldDecorator('scheduledAt', {
            initialValue: item && item.scheduledAt !== null ? moment(item.scheduledAt) : undefined
          })(
            <DatePicker
              size="large"
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              allowClear
              disabledDate={(date) => date.isBefore()}
            />
          )}
        </Form.Item>
        <div className="prime__drawer__bottom">
          <Button style={{ marginRight: 8 }} onClick={onClose}>Cancel</Button>
          <Button onClick={onSubmit} type="primary" htmlType="submit">{isEditing ? 'Save' : 'Create'}</Button>
        </div>
      </Form>
    </Drawer>
  );
});
