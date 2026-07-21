import { beforeEach, describe, expect, it } from 'vitest';
import { mount, shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import _ from 'lodash';
import CInputText from './c-input-text.vue';
import { useValidation } from '@/composable/validation';

const TestCInputText = CInputText as any;

describe('CInputText', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('Renders a label', () => {
    const wrapper = shallowMount(TestCInputText, {
      props: {
        label: 'Label',
      },
    });

    expect(wrapper.get('.label').text()).to.equal('Label');
  });

  it('Renders a placeholder', () => {
    const wrapper = shallowMount(TestCInputText, {
      props: {
        placeholder: 'Placeholder',
      },
    });

    expect(wrapper.get('.input').attributes('placeholder')).to.equal('Placeholder');
  });

  it('forwards maxlength to text inputs and textareas', () => {
    const input = shallowMount(TestCInputText, { props: { maxlength: 42 } });
    const textarea = shallowMount(TestCInputText, { props: { maxlength: 84, multiline: true } });

    expect(input.get('input').attributes('maxlength')).to.equal('42');
    expect(textarea.get('textarea').attributes('maxlength')).to.equal('84');
  });

  it('Renders a value', () => {
    const wrapper = shallowMount(TestCInputText, {
      props: {
        value: 'Value',
      },
    });

    expect(wrapper.vm.value).to.equal('Value');
  });

  it('Renders a provided id', () => {
    const wrapper = shallowMount(TestCInputText, {
      props: {
        id: 'id',
      },
    });

    expect(wrapper.get('.input').attributes('id')).to.equal('id');
  });

  it('updates value on input', async () => {
    const wrapper = shallowMount(TestCInputText);

    await wrapper.get('input').setValue('Hello');

    expect(_.get(wrapper.emitted(), 'update:value.0.0')).to.equal('Hello');
  });

  it('cannot be edited when disabled', async () => {
    const wrapper = shallowMount(TestCInputText, {
      props: {
        disabled: true,
      },
    });

    await wrapper.get('input').setValue('Hello');

    expect(_.get(wrapper.emitted(), 'update:value')).toBeUndefined();
  });

  it('renders a feedback message for invalid rules', async () => {
    const wrapper = shallowMount(TestCInputText, {
      props: { validationRules: [{ validator: () => false, message: 'Message' }] },
    });

    const feedback = wrapper.find('.feedback');
    expect(feedback.exists()).to.equal(true);
    expect(feedback.text()).to.equal('Message');
  });

  it('if the value become valid according to rules, the feedback disappear', async () => {
    const wrapper = shallowMount(TestCInputText, {
      props: {
        validationRules: [{ validator: (value: string) => value === 'Hello', message: 'Value should be Hello' }],
      },
    });

    const feedback = wrapper.find('.feedback');
    expect(feedback.exists()).to.equal(true);
    expect(feedback.text()).to.equal('Value should be Hello');

    await wrapper.setProps({ value: 'Hello' });

    expect(wrapper.find('.feedback').exists()).to.equal(false);
  });

  it('feedback does not render for valid rules', async () => {
    const wrapper = shallowMount(TestCInputText, {
      props: { rules: [{ validator: () => true, message: 'Message' }] },
    });

    expect(wrapper.find('.feedback').exists()).to.equal(false);
  });

  it('renders a feedback message for invalid custom validation wrapper', async () => {
    const wrapper = shallowMount(TestCInputText, {
      props: {
        validation: useValidation({ source: ref(), rules: [{ validator: () => false, message: 'Message' }] }),
      },
    });

    const feedback = wrapper.find('.feedback');
    expect(feedback.exists()).to.equal(true);
    expect(feedback.text()).to.equal('Message');
  });

  it('feedback does not render for valid custom validation wrapper', async () => {
    const wrapper = shallowMount(TestCInputText, {
      props: {
        validation: useValidation({ source: ref(), rules: [{ validator: () => true, message: 'Message' }] }),
      },
    });
    expect(wrapper.find('.feedback').exists()).to.equal(false);
  });

  it('if the value become valid according to the custom validation wrapper, the feedback disappear', async () => {
    const source = ref('');

    const wrapper = shallowMount(TestCInputText, {
      props: {
        validation: useValidation({
          source,
          rules: [{ validator: (value: string) => value === 'Hello', message: 'Value should be Hello' }],
        }),
      },
    });

    const feedback = wrapper.find('.feedback');
    expect(feedback.exists()).to.equal(true);
    expect(feedback.text()).to.equal('Value should be Hello');

    source.value = 'Hello';

    await wrapper.vm.$nextTick();

    expect(wrapper.find('.feedback').exists()).to.equal(false);
  });

  it('[prop:testId] renders a test id on the input', async () => {
    const wrapper = mount(TestCInputText, {
      props: {
        testId: 'TEST',
      },
    });

    expect(wrapper.get('input').attributes('data-test-id')).to.equal('TEST');
  });
});
