# Generated by Django 2.1.2 on 2019-01-23 22:18

import datetime
from django.db import migrations, models
import django.db.models.deletion
import economy.models


class Migration(migrations.Migration):

    dependencies = [
        ('grants', '0006_grant_request_ownership_change'),
        ('revenue', '0002_auto_20190123_2203'),
    ]

    operations = [
        migrations.CreateModel(
            name='Coupon',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_on', models.DateTimeField(db_index=True, default=economy.models.get_time)),
                ('modified_on', models.DateTimeField(default=economy.models.get_time)),
                ('code', models.CharField(help_text='The Coupon Code', max_length=255)),
                ('discount_per_period', models.DecimalField(decimal_places=2, help_text='Discount, per period, to be applied to this plan in USD. Must not be more than the price per period of the plan.', max_digits=50)),
                ('start_date', models.DateTimeField(default=datetime.datetime(1990, 1, 1, 0, 0), help_text='The start date for validity of this coupon')),
                ('end_date', models.DateTimeField(default=datetime.datetime(1990, 1, 1, 0, 0), help_text='The end date for validity of this coupon')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Plan',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_on', models.DateTimeField(db_index=True, default=economy.models.get_time)),
                ('modified_on', models.DateTimeField(default=economy.models.get_time)),
                ('slug', models.CharField(help_text='The Slug', max_length=255)),
                ('name', models.CharField(help_text='The SKU Name', max_length=255)),
                ('cost_per_period', models.DecimalField(decimal_places=2, help_text='Cost of this plan in USD', max_digits=50)),
                ('period_length_seconds', models.PositiveIntegerField()),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='PlanItem',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_on', models.DateTimeField(db_index=True, default=economy.models.get_time)),
                ('modified_on', models.DateTimeField(default=economy.models.get_time)),
                ('quantity', models.PositiveIntegerField()),
                ('plan', models.ForeignKey(help_text='The plan that this item is in', on_delete=django.db.models.deletion.CASCADE, related_name='items', to='revenue.Plan')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='SKU',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_on', models.DateTimeField(db_index=True, default=economy.models.get_time)),
                ('modified_on', models.DateTimeField(default=economy.models.get_time)),
                ('slug', models.CharField(help_text='The Slug', max_length=255)),
                ('name', models.CharField(help_text='The SKU Name', max_length=255)),
                ('sku', models.CharField(help_text='The SKU', max_length=255)),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Subscription',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_on', models.DateTimeField(db_index=True, default=economy.models.get_time)),
                ('modified_on', models.DateTimeField(default=economy.models.get_time)),
                ('grant_subscription', models.ForeignKey(help_text='The grants.subscription for this revenue subscription', on_delete=django.db.models.deletion.CASCADE, related_name='revenue_subscription', to='grants.Subscription')),
                ('plan', models.ForeignKey(help_text='The plan for this subscription', on_delete=django.db.models.deletion.CASCADE, related_name='subscriptions', to='revenue.Plan')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddField(
            model_name='planitem',
            name='sku',
            field=models.ForeignKey(help_text='The sku that is in this item', on_delete=django.db.models.deletion.CASCADE, related_name='planitems', to='revenue.SKU'),
        ),
        migrations.AddField(
            model_name='coupon',
            name='plan',
            field=models.ForeignKey(help_text='The plan that this coupon is for', on_delete=django.db.models.deletion.CASCADE, related_name='coupons', to='revenue.Plan'),
        ),
        migrations.AddField(
            model_name='alacartepurchase',
            name='sku',
            field=models.ForeignKey(help_text='The feature that was purchased', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='alacartegoodpurchases', to='revenue.SKU'),
        ),
    ]
