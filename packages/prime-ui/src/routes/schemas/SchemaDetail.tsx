import React from 'react';
import { Prompt } from 'react-router';
import { observable, toJS } from 'mobx';
import { observer } from 'mobx-react';
import { Instance, getParent, onPatch, clone } from 'mobx-state-tree';
import { Layout, Card, Drawer, Button, Tabs, message, Icon, Spin } from 'antd';
import { DragDropContext, Droppable, Draggable, DragStart, DropResult } from 'react-beautiful-dnd';
import { get } from 'lodash';

import { DEFAULT_GROUP_TITLE } from '../../stores/models/Schema';
import { ContentType } from '../../stores/models/ContentType';
import { ContentTypes } from '../../stores/contentTypes';
import { ALL_FIELDS } from '../../stores/queries';
import { EditField } from './components/EditField';
import { Toolbar } from '../../components/toolbar/Toolbar';
import { FieldRow } from './components/field-row/FieldRow';
import { client } from '../../utils/client';
import { Link } from 'react-router-dom';

const { Sider, Content } = Layout;
const { TabPane } = Tabs;

const highlightColor = '#FEFCDD';

type IAvailableField = {
  id: string;
  title: string;
  description: string;
}

interface IProps {
  match: {
    params: { id: string; }
  }
}

interface IState {
  flush: boolean;
  disabledDroppables: string[],
}

@observer
export class SchemaDetail extends React.Component<IProps> {

  disposeOnPatch: any;
  tabs: any = React.createRef();
  editField: any = React.createRef();
  contentType?: Instance<typeof ContentType>;
  state: IState = {
    flush: false,
    disabledDroppables: [],
  };

  @observable
  isDrawerOpen = false;

  @observable
  isNewField = false;

  @observable
  availableFields: IAvailableField[] = [];

  @observable
  selectedField: any = null;

  @observable
  selectedGroup: any = DEFAULT_GROUP_TITLE;

  @observable
  loading = false;

  @observable
  saving = false;

  componentDidMount() {
    this.load();
    document.addEventListener('keydown', this.onKeyDown, false);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown, false);
  }

  async load() {
    this.loading = true;
    this.contentType = clone(await ContentTypes.loadById(this.props.match.params.id));
    if (this.contentType) {
      this.selectedGroup = this.contentType.groups[0] || DEFAULT_GROUP_TITLE;
      const { data } = await client.query({ query: ALL_FIELDS });
      this.availableFields = (data as any).allFields;
      this.detectChanges();
    }
    this.loading = false;
  }

  saveSchema = async () => {
    this.disposeOnPatch();
    this.saving = true;
    const success = await this.contentType!.saveSchema();
    if (success) {
      message.success('Schema updated');
    }
    this.contentType!.schema.setHasChanged(false);
    this.detectChanges();
    this.saving = false;
  }

  detectChanges() {
    this.disposeOnPatch = onPatch(this.contentType!.schema, (res) => {
      this.contentType!.schema.setHasChanged(true);
    });
  }

  flushSchema() {
    this.setState({ flush: true }, () => this.setState({ flush: false }));
  }

  onKeyDown = (e: any) => {
    if (e.which == 83 && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.saveSchema();
      return false;
    }
    return true;
  }

  onOpenDrawer = () => {
    this.isDrawerOpen = true;
  }

  onCloseDrawer = () => {
    this.isDrawerOpen = false;
  }

  onDragStart = (e: DragStart) => {
    const { fields } = this.contentType!.schema;

    // const { fields } = this.state;
    const { source, draggableId } = e;
    const [key, fieldId] = draggableId.split('.');

    // Allow drop on all Droppables
    const disabledDroppables: string[] = [];

    if (source.droppableId === 'AvailableFields') {
      // The Draggable is a new field!
      if (fieldId === 'group') {
        fields.forEach(f => {
          if (f.type && f.type === 'group') {
            disabledDroppables.push(`FieldGroup.${f.id}`);
          }
        });
      }
    } else {
      const movingField = fields.find(({ id }) => id === fieldId);
      if (!movingField) return null;

      const parentTree = getParent(movingField);
      const parentNode = getParent(parentTree);
      const parentNodeId = parentNode && (parentNode as any).id;

      if (parentNodeId) {
        // Disable current group
        disabledDroppables.push(`Group.${this.selectedGroup}`);
      }

      fields.forEach(f => {
        if (f.type === 'group' && f.id !== parentNodeId) {
          // Disable other fields
          disabledDroppables.push(`FieldGroup.${f.id}`);
        }
      });
    }

    this.setState({
      disabledDroppables,
    });
  }

  onDragEnd = (e: DropResult) => {
    if (!this.contentType) return;

    const { destination, draggableId } = e;

    if (!destination) {
      // Skip operation if no destination
      return null;
    }

    const [draggableKey, fieldId] = draggableId.split('.');
    const [key, dropId] = destination.droppableId.split('.');

    if (draggableKey === 'AvailableField') {
      // Handle dropping of a new field
      const addedField = this.contentType.schema.add({
          name: '',
          title: '',
          description: '',
          group: this.selectedGroup,
          type: fieldId,
        },
        destination.index,
        this.selectedGroup,
        (key === 'Field') ? dropId : undefined,
      );

      this.isNewField = true;
      this.selectedField = addedField;

      // Nested droppable groups behave badly
      // Only fix is to flush the schema
      if (fieldId === 'group') {
        this.flushSchema();
      }

      if (addedField) {
        this.onOpenDrawer();
      } else {
        message.error('Could not add field :(');
      }
    } else {
      // Handle moving of a current field
      this.contentType.schema.move(fieldId, destination.index);
    }
  }

  onFieldDelete = (field: any) => {
    this.contentType!.schema.remove(field);
    this.flushSchema();
  }

  onFieldClick = (field: any) => {
    this.isNewField = false;
    this.selectedField = field;
    this.onOpenDrawer();
  }

  onFieldDisplay = (field: any) => {
    this.contentType!.schema.setDisplay(field);
    this.flushSchema();
  }

  onSave = () => {
    this.saveSchema();
  }

  onEditFieldCancel = () => {
    const { selectedField, isNewField } = this;
    if (selectedField && isNewField) {
      this.contentType!.schema.remove(selectedField);
    }
    this.onCloseDrawer();
  }

  onEditFieldSubmit = async (field: any) => {
    const isValid = await new Promise(resolve =>
      this.editField.current.validateFields((hasErrors: any) => {
        resolve(!hasErrors);
      }));

    if (isValid) {
      this.selectedField.update({
        name: field.name,
        title: field.title,
        description: field.description,
        type: field.type,
        options: field.options,
      });
      this.selectedField = null;
      this.onCloseDrawer();
    } else {
      message.error('Fix errors before saving');
    }
  }

  onTabsChange = (selectedGroup: string) => {
    this.selectedGroup = selectedGroup;
  }

  onTabsEdit = (targetKey: any, action: string) => {
    if (action === 'add') {
      this.onGroupAdd();
    } else if (action === 'remove') {
      if (confirm('Are you sure?')) {
        this.contentType!.removeGroup(targetKey);
      }
    }
  }

  onGroupAdd = () => {
    const title = prompt('Enter group name', '');
    if (title) {
      this.contentType!.addGroup(title);
    }
  }

  renderGroupField = (field: any) => (
    <Droppable
      key={field.id}
      droppableId={`Field.${field.id}`}
      isDropDisabled={this.state.disabledDroppables.indexOf(`FieldGroup.${field.id}`) >= 0}
    >
      {(droppableProvided, droppableSnapshot) => (
        <div
          ref={droppableProvided.innerRef}
          style={{ minHeight: 80, transition: 'background-color 0.3s ease-in-out', backgroundColor: droppableSnapshot.isDraggingOver ? highlightColor : 'rgba(0, 0, 0, 0.025)', padding: 16 }}
          {...droppableProvided.droppableProps}
        >
          {field.fields.map(this.renderField)}
          {droppableProvided.placeholder}
        </div>
      )}
    </Droppable>
  );

  renderField = (field: any, index: number) => (
    <FieldRow
      key={field.id}
      field={field}
      index={index}
      onDisplayClick={this.onFieldDisplay}
      onClick={this.onFieldClick}
      onDelete={this.onFieldDelete}
    >
      {field.type === 'group' && this.renderGroupField(field)}
    </FieldRow>
  );

  renderAvailableField = (field: any, index: number) => (
    <Draggable
      key={`AvailableField.${field.id}`}
      draggableId={`AvailableField.${field.id}`}
      index={index}
    >
      {(draggableProvided, draggableSnapshot) => (
        <div
          ref={draggableProvided.innerRef}
          {...draggableProvided.draggableProps}
          {...draggableProvided.dragHandleProps}
          style={{ ...draggableProvided.draggableProps.style, marginBottom: 10 }}
        >
          <Card
            style={{ borderStyle: 'dashed' }}
            bodyStyle={{
              padding: '8px 16px',
              fontSize: 14
            }}
            hoverable
          >
            <div><strong>{field.title}</strong></div>
            <div style={{ color: '#999' }}>{field.description}</div>
          </Card>
        </div>
      )}
    </Draggable>
  );

  renderGroup = (groupName: any) => {
    const group = this.contentType!.schema.groups.find(g => g.title.toLowerCase() === groupName.toLowerCase());

    return (
      <TabPane
        key={groupName}
        tab={groupName}
        style={{ height: 'calc(100vh - 120px)', overflowY: 'auto' }}
      >
        <Droppable
          key={groupName}
          droppableId={`Group.${groupName}`}
          isDropDisabled={this.state.disabledDroppables.indexOf(`Group.${groupName}`) >= 0}
        >
          {(droppableProvided, droppableSnapshot) => (
            <div
              ref={droppableProvided.innerRef}
              style={{ minHeight: '100%', transition: 'background-color 0.3s ease-in-out', backgroundColor: droppableSnapshot.isDraggingOver ? highlightColor : '', padding: 32 }}
            >
              {group && group.fields.filter((n: any) => n.contentTypeId === this.contentType!.id).map(this.renderField)}
              {droppableProvided.placeholder}
              <div style={{ height: 80 }} />
            </div>
          )}
        </Droppable>
      </TabPane>
    );
  }

  render() {
    const { contentType, availableFields } = this;
    const { flush } = this.state;
    const title = get(contentType, 'title');

    return (
      <Layout style={{ minHeight: '100%' }}>
        <Toolbar>
          <div style={{ flex: 1, display: 'flex' }}>
            <Link to="/schemas" className="ant-btn-back">
              <Icon type="left" />
            </Link>
            <h3 style={{ margin: 0 }}>
              {this.loading ? null : title}
              <Spin spinning={this.loading} delay={500} />
            </h3>
          </div>
          <Button
            type="dashed"
            disabled
            style={{ marginRight: 8 }}
            title="WIP"
            icon="cloud-download"
          >
            Import
          </Button>
          <Button
            type="primary"
            onClick={this.onSave}
            icon="save"
            loading={this.saving}
          >
            Save
          </Button>
        </Toolbar>
        <Layout>
          {contentType && !flush && (
            <DragDropContext
              onDragEnd={this.onDragEnd}
              onDragStart={this.onDragStart}
            >
              <Content>
                <Prompt
                  when={contentType.schema.hasChanged}
                  message="You have unsaved changes. Are you sure you want to leave?"
                />
                {contentType.groups && contentType.groups.map && (
                  <Tabs
                    className="tabs-schema"
                    defaultActiveKey={this.selectedGroup}
                    onEdit={this.onTabsEdit}
                    onChange={this.onTabsChange}
                    type="editable-card"
                    ref={this.tabs}
                  >
                    {contentType.groups.map(this.renderGroup)}
                  </Tabs>
                )}
              </Content>
              <Sider
                theme="light"
                width={300}
                trigger={null}
                collapsed={false}
                style={{ padding: 16, maxHeight: 'calc(100vh - 64px)', overflowY: 'auto' }}
              >
                <Droppable droppableId="AvailableFields" isDropDisabled>
                  {(droppableProvided) => (
                    <div ref={droppableProvided.innerRef}>
                      {availableFields.map(this.renderAvailableField)}
                      {droppableProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </Sider>
            </DragDropContext>
          )}
        </Layout>
        {contentType && (
          <Drawer
            title={`${this.isNewField ? 'New' : 'Edit'} field`}
            width={360}
            placement="right"
            maskClosable={true}
            onClose={this.onEditFieldCancel}
            visible={this.isDrawerOpen}
          >
            {this.selectedField && (<EditField
              ref={this.editField}
              availableFields={availableFields}
              field={this.selectedField}
              schema={contentType.schema}
              onCancel={this.onEditFieldCancel}
              onSubmit={this.onEditFieldSubmit}
            />)}
          </Drawer>
        )}
      </Layout>
    )
  }
}
