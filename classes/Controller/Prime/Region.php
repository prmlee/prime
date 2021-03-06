<?php defined('SYSPATH') or die('No direct script access.');
/**
 * Prime Region Controller
 *
 * @author Birkir Gudjonsson (birkir.gudjonsson@gmail.com)
 * @package Prime
 * @category Controller
 * @copyright (c) 2013 SOLID Productions
 */
class Controller_Prime_Region extends Controller_Prime_Template {

	/**
	 * @var bool Disable auto render
	 */
	public $auto_render = FALSE;

	/**
	 * Default page
	 *
	 * @return void
	 */
	public function action_index()
	{
		// Redirect to Pages
		HTTP::redirect('Prime/Page');
	}

	/**
	 * Add Region to Page
	 *
	 * @return void
	 */
	public function action_add()
	{
		// Extract region and reference ids
		list($id, $reference, $name, $page, $sticky) = explode(':', $this->request->param('id'));

		// Create Region model
		$region = ORM::factory('Prime_Region');

		// Set model values
		$region->prime_page_id   = (intval($sticky) === 1) ? NULL : $page;
		$region->prime_module_id = $id;
		$region->name            = $name;
		$region->settings        = '{}';
		$region->sticky          = $sticky;

		// Save Region
		$region->save();

		// Set Region position
		$region->position($reference);

		// Get Region display Response
		$output = Request::factory('Prime/Region/Display/'.$region->id)->execute();

		if ( ! empty($region->prime_page_id))
		{
			// Bump the page revision
			ORM::factory('Prime_Page', $region->prime_page_id)->save();
		}
		else
		{
			ORM::factory('Prime_Region', $region->id)->publish();
		}

		// Set region view as Response body
		$this->response->body('<div'.HTML::attributes(['class' => 'prime-region-item', 'data-id' => $region->id]).'>'.$output.'</div>');
	}

	/**
	 * Move Region above Reference Region
	 *
	 * @return void
	 */
	public function action_move()
	{
		// Extract region and reference ids
		list($id, $reference, $name, $page, $sticky) = explode(':', $this->request->param('id'));

		// Load region record
		$region = ORM::factory('Prime_Region', intval($id));

		// Set model values
		$region->prime_page_id = (intval($sticky) === 1) ? NULL : $page;
		$region->name          = $name;
		$region->sticky        = $sticky;

		// Execute movement query
		$region->position($reference);

		if ( ! empty($region->prime_page_id))
		{
			// Update region position
			ORM::factory('Prime_Page', $region->prime_page_id)->save();
		}
		else
		{
			ORM::factory('Prime_Region', $region->id)->publish();
		}
	}

	/**
	 * Remove Region
	 *
	 * @return void
	 */
	public function action_remove()
	{
		// Find and delete Region
		$region = ORM::factory('Prime_Region', $this->request->param('id'));

		if ( ! empty($region->prime_page_id))
		{
			// Bump the page revision
			ORM::factory('Prime_Page', $region->prime_page_id)->save();
		}

		// Delete
		$region_copy = clone $region;
		$region->delete();

		if (empty($region->prime_page_id))
		{
			$region_copy->publish();
		}
	}

	/**
	 * Display settings popup for Region
	 *
	 * @return void
	 */
	public function action_settings()
	{
		// Find region
		$region = ORM::factory('Prime_Region', $this->request->param('id'));

		if ( ! $region->loaded())
		{
			// We did not find region
			throw HTTP_Exception::factory(404, 'Region was not found.');
		}

		// Get region module
		$module = $region->module();

		// Get module fields
		$fields = $module->params();

		// Setup region modal view
		$view = View::factory('Prime/Region/Settings')
		->set('fields', $fields)
		->set('region', $region)
		->set('data', $module->settings);

		if ($this->request->method() === HTTP_Request::POST)
		{
			// Save module with POST data
			$module->save($this->request->post());

			if (intval($region->prime_page_id) > 0)
			{
				// Bump the page revision
				ORM::factory('Prime_Page', $region->prime_page_id)->save();
			}
			else
			{
				ORM::factory('Prime_Region', $region->id)->publish();
			}

			// Re-render region
			$view = Request::factory('Prime/Region/Display/'.$region->id)->execute();
		}

		// Set view as Response body
		$this->response->body($view);
	}

	/**
	 * Set template settings and store in region
	 *
	 * @return void
	 */
	public function action_template_settings()
	{
		// Extract region and template from params
		list ($region, $template, $key) = explode(':', $this->request->param('id'));

		// Find region
		$region = ORM::factory('Prime_Region', $region);

		if ( ! $region->loaded())
		{
			// We did not find region
			throw HTTP_Exception::factory(404, 'Region was not found.');
		}

		// Find fields for template
		$fields = ORM::factory('Prime_Field')
		->where('resource_type', '=', 'Template')
		->where('resource_id', '=', $template)
		->order_by('position', 'ASC')
		->find_all();

		// Setup groups
		$groups = array();

		// Attach fields to its own group
		foreach ($fields as $field)
		{
			$group = ! empty($group) ? $group : 'General';

			if ( ! isset($groups[$group]))
				$groups[$group] = array();

			$groups[$group][] = $field;
		}

		// Decode settings
		$settings = json_decode($region->settings, TRUE);

		// Locate template properties
		$tpl = Arr::get($settings, '_'.$key, array());

		// Setup view
		$view = View::factory('Prime/Region/Template_Settings')
		->set('fields', $groups)
		->set('tpl', $template)
		->set('data', $tpl);

		if ($this->request->method() === HTTP_Request::POST)
		{
			// Get post array
			$post = $this->request->post();

			// Overwrite them with post data
			foreach ($fields as $field)
			{
				$tpl[$field->name] = $field->field->save(Arr::get($post, $field->name, NULL));
			}

			// Re-associate array to settings
			$settings['_'.$key] = $tpl;

			// Dump encoded data to settings column
			$region->settings = json_encode($settings);

			// Save settings
			$region->save();

			if (intval($region->prime_page_id) > 0)
			{
				// Bump the page revision
				ORM::factory('Prime_Page', $region->prime_page_id)->save();
			}
			else
			{
				ORM::factory('Prime_Region', $region->id)->publish();
			}

			// Re-render region
			$view = Request::factory('Prime/Region/Display/'.$region->id)->execute();
		}

		// Set view as Response body
		$this->response->body($view);
	}

	/**
	 * Display region by ID in query string
	 *
	 * @return void
	 */
	public function action_display()
	{
		// Find region
		$region = ORM::factory('Prime_Region', $this->request->param('id'));

		if ($region->loaded())
		{
			// Request frontpage with region id
			$response = Request::factory('')
			->query('region', $region->id)
			->query('mode', 'design')
			->execute();

			// Set proxied html as Response body
			$this->response->body($response->body());
		}
	}

}