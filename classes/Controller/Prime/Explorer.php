<?php defined('SYSPATH') or die('No direct script access.');
/**
 * Prime Explorer Controller
 *
 * @author Birkir Gudjonsson (birkir.gudjonsson@gmail.com)
 * @package Prime
 * @category Controller
 * @copyright (c) 2013 SOLID Productions
 */
class Controller_Prime_Explorer extends Controller_Prime_Template {

	/**
	 * @var array JSON Response
	 */
	public $json = NULL;

	/**
	 * Default action displays the tree on left and
	 * upload target dropzone in view.
	 *
	 * @return void
	 */
	public function action_tree()
	{
		// Setup view
		$this->view = View::factory('Prime/Explorer/Tree')
		->bind('files', $files)
		->set('open', json_decode(Arr::get($_COOKIE, 'tree-explorer', '{}'), TRUE));

		// Get list of files in application directory
		$files = Prime::list_files(NULL, [APPPATH]);

		// No cache or logs files please
		unset($files['cache']);
		unset($files['logs']);
	}

	/**
	 * Default page
	 *
	 * @return void
	 */
	public function action_index() {}

	/**
	 * Edit action will choose which type of editor will be used.
	 *
	 * @return void
	 */
	public function action_file()
	{
		// Get file
		$file = $this->request->param('id');

		if ( ! file_exists(APPPATH.$file))
		{
			// Could not find file
			throw new HTTP_Exception('Could not find file');
		}

		// Export file info
		$fileinfo = pathinfo($file);

		// Set file absolute path
		$fileinfo['file'] = Kohana::find_file($fileinfo['dirname'], $fileinfo['filename'], $fileinfo['extension'], TRUE);

		// Show ace editor
		$this->ace($fileinfo);
	}

	/**
	 * Save file contents
	 *
	 * @return void
	 */
	public function action_save()
	{
		// Set JSON Response
		$this->json = [
			'status'  => FALSE,
			'message' => __('Unknown error')
		];

		// Get file
		$file = $this->request->param('id');

		if ( ! file_exists(APPPATH.$file))
		{
			// Check if file exists
			throw new HTTP_Exception('Could not find file');
		}

		// Get absolute path
		$file = APPPATH.$file;

		if (is_writable($file))
		{
			// Open file handler
			$fh = fopen($file, 'w');

			// Write request body contents to file
			fwrite($fh, $this->request->body());

			// Close file handler
			fclose($fh);

			// Set JSON Response status
			$this->json['status'] = TRUE;
			$this->json['message'] = __('File was saved.');
		}
		else
		{
			$this->json['message'] = __('Permission denied.');
		}
	}

	public function ace(array $file)
	{
		$this->view = View::factory('Prime/Explorer/Ace/Ace')
		->bind('content', $content)
		->bind('filename', $filename)
		->bind('mode', $mode)
		->bind('theme', $theme)
		->bind('emmet', $emmet)
		->set('id', $this->request->param('id'))
		->set('modes', Prime::$config->modes)
		->set('themes', Prime::$config->themes);

		$file['file'] = end($file['file']);

		// set theme and handpick github if none is set
		$theme = Arr::get($_COOKIE, 'ace-theme', 'github');

		// set emmet flag
		$emmet = (bool) Arr::get($_COOKIE, 'ace-emmet', TRUE);

		// convert extension to correct mode
		switch ($file['extension'])
		{
			case 'js': $mode = 'javascript'; break;
			case 'as': $mode = 'actionscript'; break;
			case 'cpp': case 'cc': case 'c': case 'h': $mode = 'c_cpp'; break;
			case 'clj': $mode = 'clojure'; break;
			case 'cs': $mode = 'csharp'; break;
			case 'py': $mode = 'python'; break;
			case 'md': $mode = 'markdown'; break;
			case 'ts': $mode = 'typescript'; break;
			case 'vbs': $mode = 'vbscript'; break;
			default: $mode = $file['extension'];
		}

		// set filename
		$filename = $file['basename'];

		// set content
		$content = file_get_contents($file['file']);
	}

	/**
	 * Overload after controller execution method
	 *
	 * @return parent::after
	 */
	public function after()
	{
		// check for asyncronous request
		if ($this->request->is_ajax() OR ! $this->request->is_initial())
		{
			// disable auto render
			$this->auto_render = FALSE;

			// render the view
			return $this->response->body(isset($this->json) ? json_encode($this->json) : $this->view->render());
		}
		else
		{
			// always set tree
			$this->template->left = Request::factory('Prime/Explorer/Tree')
			->execute();
		}

		return parent::after();
	}

} // End Explorer