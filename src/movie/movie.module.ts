import { Module } from '@nestjs/common'
import { MovieController } from './movie.controller'
import { MovieService } from './movie.service'
import { TypegooseModule } from 'nestjs-typegoose'
import { MovieModel } from './movie.model'
import { TelegramModule } from 'src/telegram/telegram.module'
import { UserModel } from 'src/user/user.model'

@Module({
	controllers: [MovieController],
	imports: [
		TypegooseModule.forFeature([
			{
				typegooseClass: MovieModel,
				schemaOptions: {
					collection: 'Movie',
				},
			},
		]),
		TelegramModule,
		UserModel,
	],
	providers: [MovieService],
	exports: [MovieService],
})
export class MovieModule {}
