<div class="tabbable tabs-left">
	<ul class="nav nav-tabs">
		<?php $i = 0; ?>
		<?php foreach ($fields as $groupName => $group): ?>
			<li class="<?=($i === 0 ? 'active' : NULL);?>"><a href="#region_<?=$region->id;?>_<?=$i;?>" data-toggle="tab"><?=$groupName;?></a></li>
			<?php $i++; ?>
		<?php endforeach; ?>
	</ul>
	<div class="tab-content">
			<?php $i = 0; ?>
			<?php foreach ($fields as $groupName => $group): ?>
				<div class="tab-pane<?=($i === 0 ? ' active' : NULL);?>" id="region_<?=$region->id;?>_<?=$i;?>">
					<?=Form::open();?>
						<?php foreach ($group as $field): ?>
							<?php $fieldClass = call_user_func_array([$field['field'], 'factory'], [$field]); ?>
							<?=$fieldClass->as_input('Region'.$region->id, $region); ?>
						<?php endforeach; ?>
					<?=Form::close();?>
				</div>
				<?php $i++; ?>
			<?php endforeach; ?>
	</div>
</div>