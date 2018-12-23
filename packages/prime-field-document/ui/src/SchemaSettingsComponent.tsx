import { IPrimeFieldProps } from '@primecms/field';
import { Form, Select, Switch } from 'antd';
import * as React from 'react';

interface IContentType {
  id: string;
  title: string;
  isSlice?: boolean;
}

export class SchemaSettingsComponent extends React.PureComponent<IPrimeFieldProps> {
  public render() {
    const { form, stores } = this.props;

    return (
      <>
        <Form.Item label="Document types" style={{ marginBottom: 8 }}>
          {form.getFieldDecorator('options.contentTypeIds')(
            <Select
              placeholder="Select document types"
              mode="multiple"
            >
              {stores.ContentTypes.list.filter((n: IContentType) => !n.isSlice).map((contentType: IContentType) => (
                <Select.Option
                  value={contentType.id}
                  key={contentType.id}
                >
                  {contentType.title}
                </Select.Option>
              ))}
            </Select>
          )}
        </Form.Item>
        <Form.Item label="Options" style={{ marginBottom: -8 }}  />
        <Form.Item>
          {form.getFieldDecorator('options.multiple', {
            valuePropName: 'checked'
          })(
            <Switch />
          )}
          <label htmlFor="options.multiple" style={{ marginLeft: 8 }}>Allow multiple documents</label>
        </Form.Item>
      </>
    );
  }
}
