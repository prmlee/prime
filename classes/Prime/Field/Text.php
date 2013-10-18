<?php defined('SYSPATH') or die('No direct script access.');
/**
 * Prime Field Text
 *
 * @author Birkir Gudjonsson (birkir.gudjonsson@gmail.com)
 * @package Prime
 * @category Fields
 * @copyright (c) 2013 SOLID Productions
 */
class Prime_Field_Text extends Prime_Field {

	/**
	 * Params for field
	 *
	 * @return array
	 */
	public function params()
	{
		return [];
	}

	/**
	 * Fieldset render method
	 *
	 * @return View
	 */
	public function as_input($form = 'form_', $item)
	{
		// setup view
		$view = View::factory('Prime/Field/String')
		->set('field', $this->field)
		->set('form', $form)
		->set('caller', $this)
		->set('item', $item)
		->set('value', $this->value($item));

		return $view;
	}

} // End Priem Field Text